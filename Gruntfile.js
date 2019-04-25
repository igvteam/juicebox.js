const webpackConfig = require('./webpack.config.js');
const webackSiteConfig = require('./webpack.config.site.js');

module.exports = function (grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        sass: {
            css: {
                files: {
                    'css/juicebox.css': 'css/juicebox.scss'
                }
            }
        },

        qunit: {
            all: ['test/runTests.html']
        },

        connect: {
            uses_defaults: {}
        },

        copy: {
            css: {
                expand: true,
                flatten: true,
                src: 'css/juicebox.css',
                dest: 'dist/css'
            },
            img: {
                expand: true,
                src: 'css/img/*',
                dest: 'dist'
            },
            sitecss: {
                expand: true,
                flatten: true,
                src: 'css/juicebox.css',
                dest: 'website/css'
            },
            siteimg: {
                expand: true,
                flatten: true,
                src: 'css/img/*',
                dest: 'website/css/img'
            },
            sitejs: {
                expand: true,
                flatten: true,
                src: 'dist/*.js',
                dest: 'website/js'
            },
            sitemap: {
                expand: true,
                flatten: true,
                src: 'dist/*.map',
                dest: 'website/js'
            }
        },

        webpack: {
            prod: webpackConfig,
            site: webackSiteConfig
        },

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-concat');

    // grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-uglify-es');

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.loadNpmTasks('grunt-webpack');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    //grunt.registerTask('default', ['concat:igvexp', 'uglify:igvexp']);
    //grunt.registerTask('default', ['concat:igv', 'uglify:igv', 'md2html:igv']);
    grunt.registerTask('default', ['webpack:prod', 'webpack:site', 'copy']);

    grunt.task.registerTask('unittest', 'Run one unit test.', function (testname) {

        if (!!testname)
            grunt.config('qunit.all', ['test/' + testname + '.html']);

        grunt.task.run('qunit:all');

    });

};

