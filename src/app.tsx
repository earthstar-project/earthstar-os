import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { EarthstarRouter } from './router';
import { Earthbar } from './earthbar';
import { DebugView } from './debugView';

//================================================================================
// MAIN

let router = new EarthstarRouter();

let addDemoContent = (router : EarthstarRouter) => {
    let demoKeypairs = [
        {
            address: "@abcd.Evwdch1up4ecf3bxNjaKFy9CEZpizLPreYu3J7tQELUw",
            secret: "6qdayaEK2uiDZknVVNuz7PfcbCNaT3yDzd3b3GBw5pAo"
        },
        {
            address: "@suzy.D79SNKuFsNKGhHgzGsvWG9V8JQG8MwyjSrvkjDQ2mVZD",
            secret: "2nwvseUKu6mxSFu3YnFCdTFw5Pyud1aBW997XCVs6LDn"
        },
        {
            address: "@fooo.A14CghnKZSsEiShRfgPHPQpstWsLfqFELGwinyPCPzaK",
            secret: "HDGn792ZFeAa2HWpWRBhVGsb7uQJKwxUT4wSKvJxcgSf"
        }
    ]
    demoKeypairs.forEach(kp => router.setAuthorKeypair(kp));
    router.setAuthorKeypair(null);

    router.setWorkspace('+sailing.xxxxxxxxxxx');
    router.setWorkspace('+gardening.xxxxxxxxxx');
    router.setWorkspace('+solarpunk.xxxxxxx');
    router.setWorkspace('+aaaaabbbbbccccc.xxxxxxx');
    router.setWorkspace('+unlisted.xxxxxxxxxxxxxxxxxxxx');
    router.setWorkspace('+invite.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    router.setWorkspace('+z.z');
    router.setWorkspace('+blip.blorp');
    router.setWorkspace(null);
}
//addDemoContent(router);

ReactDOM.render(
    [
        <Earthbar key="earthbar" router={router} />,
        <DebugView key="debug" router={router} />,
    ],
    document.getElementById('react-slot')
);
