/**
 * Created by jrobinso on 3/11/17.
 */
import igv from '../node_modules/igv/dist/igv.esm.min.js';

function runColorTests() {

    test("Color gradient", function() {

        var cs =  new igv.GradientColorScale(
            {
                low: 0,
                lowR: 255,
                lowG: 255,
                lowB: 255,
                high: 1000,
                highR: 255,
                highG: 0,
                highB: 0
            }
        );

        var color = cs.getColor(700);
        ok(color);

    })

}
