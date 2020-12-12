/*
 * @author Jim Robinson Dec-2020
 */

import "./utils/mockObjects.js"
import {assert} from 'chai';

import {extractQuery, decodeQuery} from "../js/urlUtils.js";
import {StringUtils} from "../node_modules/igv-utils/src/index.js";

suite("testURLs", function () {

    test("Session blob", async function () {

        const url = "http://aidenlab.org/juicebox/?session=blob:1ZPPbtswDMbfxacNECRR_51b0Qwb1tPS24bAUGylMWpbmaS1w4q8e.UYS5d06C7JYRfC_kRTP9Ifn4pV8I_RhVjMvj0VP0JXzIpNSts4IyRybHv7yw_2MeLa92TT1uu2czE_RPedDLc_N5._fmrmiy_0_uN8QYBhDhg0uZpfXe9DxSnOXxWoGGzvcu1jMSabRpUhhhQCUyoMUjHJNQetmURQgsJKajAgGdfaIMBSMM4MPUR0s8ilat_5cFvbbqwHQmAGhmsBwuQkLRCTElFER5KHNqfo0pRQCiryJUbpMh.kYOv7CwyiHZILuemq9kOydaoa39t2iERSSqtV58dbDxM6FvdtZTXcrd6NLezbeF_s0HkZq877bSS9C3eumV7wyjVb98L117M_8SjiauS7AN1DrD4Mjb8mTbteu.CG1NpuQoFTzrdSjnHHWXKVcZfnBJ5A9_GV.0_Uy9mfYa0FL0VeAloa_tr.yoCRzAAVl7T_1O8ZvAUm05_dW9Ov.h_W840FYP9egJeUk5n.xl3ulrtn"

        const query = extractQuery(url);

        const sessionBlob = query.session;
        assert.ok(sessionBlob);

        const sessionJSON = JSON.parse(StringUtils.uncompressString(sessionBlob.substring(5)));
        assert.equal(sessionJSON.browsers.length, 2);

        const browser1 = sessionJSON.browsers[0];
        assert.equal(browser1.name, "ADAC_30.hic");
        assert.equal(browser1.tracks.length, 3);

    })

    test("parameters", async function () {

        const url = "http://www.aidenlab.org/juicebox/?state=3,3,6,5537.98746,5537.749239047619,1,KR&colorScale=18.89619862813927&hicUrl=https://s3.amazonaws.com/hicfiles/external/wapl_hic/WT.hic&name=Haarhuis%20et%20al.%20|%20Cell%202017%20Hap1%20control&tracks=http://hicfiles.s3.amazonaws.com/external/GM12878_CTCF_orientation.bed|GM12878_CTCF_orientation.bed||rgb(22,%20129,%20198)|||https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed.gz|gencode.v18.collapsed.bed.gz||rgb(22,%20129,%20198)"

        const query = extractQuery(url);
        assert.equal(query.state, "3,3,6,5537.98746,5537.749239047619,1,KR");
        assert.equal(query.colorScale, "18.89619862813927")
        assert.equal(query.name, "Haarhuis%20et%20al.%20|%20Cell%202017%20Hap1%20control");

        const uriDecode = url.includes("%2C");
        const config = decodeQuery(query, uriDecode);

        assert.equal(config.url, "https://s3.amazonaws.com/hicfiles/external/wapl_hic/WT.hic");
        assert.equal(config.name, "Haarhuis et al. | Cell 2017 Hap1 control");

        const state = config.state;
        assert.equal(state.chr1, "3");
        assert.equal(state.chr2, "3");
        assert.equal(state.x, 5537.98746);
        assert.equal(state.y, 5537.749239047619);
        assert.equal(state.normalization, "KR");

        assert.equal(config.tracks.length, 2);

    })
})
