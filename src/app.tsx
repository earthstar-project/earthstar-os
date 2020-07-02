import * as React from 'react';
import * as ReactDOM from 'react-dom';
import deepEqual = require('fast-deep-equal');
import {
    WorkspaceAddress,
    AuthorKeypair,
    AuthorAddress,
} from 'earthstar';
import { notNull, sorted } from './util';
import { Emitter } from './emitter';
import { Thunk } from './types';
let log = console.log;

//================================================================================

type HashParams = { [key:string] : string };

let getHashParams = () : HashParams => {
    if (!window.location.hash) { return {}; }
    let params : { [key:string] : string } = {};
    let USParams = new URLSearchParams(window.location.hash.slice(1)); // remove leading '#'
    for (let [k,v] of USParams.entries()) {
        params[k] = v;
    }
    return params;
}
let setHashParams = (params : HashParams) : void => {
    let newHash = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    log('setting hash to', params);
    log('setting hash to', newHash);
    window.location.hash = newHash;
}

//================================================================================

let LOGIN_HISTORY_LOCALSTORAGE_KEY = 'earthstar-logins';
type LoginHistory = {
    workspaceAddresses : (WorkspaceAddress | null)[];  // most recent first
    authorKeypairs : (AuthorKeypair | null)[];  // most recent first.  null = guest mode
    // servers : string[];  // TODO
}

// expected url hash params:
// #workspace=gardening.xxxx
// note we omit the plus on the workspace address, because it would have to be percent-encoded.
// if workspace is null, it's absent from the url hash.
class LoginStorage {
    workspaceAddress : WorkspaceAddress | null;
    authorKeypair : AuthorKeypair | null;
    history : LoginHistory;
    onChange : Emitter<undefined>;
    constructor() {
        log('LoginStorage constructor');
        this.onChange = new Emitter<undefined>();
        this.history = {
            workspaceAddresses: [null],
            authorKeypairs: [null],
        }

        // load history from localStorage
        let raw = localStorage.getItem(LOGIN_HISTORY_LOCALSTORAGE_KEY);
        if (raw) {
            try {
                this.history = JSON.parse(raw);
            } catch (e) {
            }
        }
        log('...history:', this.history);

        // load workspaceAddress from hash params
        this.workspaceAddress = getHashParams().workspace || null;
        if (this.workspaceAddress) {
            // restore '+'
            this.workspaceAddress = this.workspaceAddress.trim();
            if (!this.workspaceAddress.startsWith('+')) { this.workspaceAddress = '+' + this.workspaceAddress; }
            // save to front of history workspace list (as most recent)
            this.history.workspaceAddresses = this.history.workspaceAddresses.filter(w => w !== this.workspaceAddress);
            this.history.workspaceAddresses.unshift(this.workspaceAddress);
            this._saveHistory();
        }
        log('...loaded workspace from hash:', this.workspaceAddress);


        // load latest author from history
        if (this.history.authorKeypairs.length == 0) {
            this.history.authorKeypairs = [null];
        }
        this.authorKeypair = this.history.authorKeypairs[0];
        log('...loaded author from history: ', this.authorKeypair);
    }
    _saveHistory() {
        log('        saving history');
        localStorage.setItem(LOGIN_HISTORY_LOCALSTORAGE_KEY, JSON.stringify(this.history));
    }
    setWorkspace(workspaceAddress : WorkspaceAddress | null) {
        log('setWorkspace(' + workspaceAddress + ')');
        this.workspaceAddress = workspaceAddress;
        // update history to move workspace to the beginning of the list (most recent)
        log('...updating history');
        this.history.workspaceAddresses = this.history.workspaceAddresses.filter(w => w !== workspaceAddress);
        this.history.workspaceAddresses.unshift(workspaceAddress);
        this._saveHistory();
        // update hash params.
        if (workspaceAddress === null) {
            log('...removing workspace from hash params');
            let params = getHashParams();
            delete params.workspace;
            setHashParams(params);
        } else {
            log('...updating workspace in hash params');
            let params = getHashParams();
            params.workspace = workspaceAddress.slice(1);  // remove '+'
            setHashParams(params);
        }
        this.onChange.send(undefined);
    }
    setAuthorAddress(authorAddress : AuthorAddress | null) {
        // a helper for when you only know the address, not the whole keypair
        if (authorAddress === null) {
            this.setAuthorKeypair(null);
            return;
        }
        for (let kp of this.history.authorKeypairs) {
            if (kp !== null && kp.address === authorAddress) {
                this.setAuthorKeypair(kp);
                return;
            }
        }
        console.warn('setAuthorAddress: could not find keypair with address = ', JSON.stringify(authorAddress));
    }
    setAuthorKeypair(authorKeypair : AuthorKeypair | null) { 
        log('setAuthorKeypair:', authorKeypair);
        this.authorKeypair = authorKeypair;

        // update history to move author to the beginning of the list (most recent)
        // note that the authorKeypair list includes a null representing guest mode
        log('...updating history');
        this.history.authorKeypairs = this.history.authorKeypairs.filter(a => !deepEqual(a, authorKeypair));
        this.history.authorKeypairs.unshift(authorKeypair);
        this._saveHistory();

        this.onChange.send(undefined);
    }
}

//================================================================================

let sBar : React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingTop: 15,
    paddingLeft: 15,
    borderBottom: '2px solid #5e4d76',
}
let sBarItem : React.CSSProperties = {
    flexShrink: 1,
    paddingBottom: 15,
    paddingRight: 15,
}
let sBarSpacer : React.CSSProperties = {
    flexGrow: 1,
}

interface LoginBarProps {
    loginStorage : LoginStorage;
}
class LoginBarView extends React.Component<LoginBarProps, any> {
    unsub : Thunk | null = null;
    componentDidMount() {
        log('LoginBarView: subscribing to loginStorage changes');
        this.unsub = this.props.loginStorage.onChange.subscribe(() => {
            log('LoginBarView: loginStorage changed; re-rendering');
            this.forceUpdate();
        });
    }
    componentWillUnmount() {
        if (this.unsub) { this.unsub(); }
    }
    render() {
        log('LoginBarView: render');
        let loginStorage = this.props.loginStorage;
        return <div style={sBar}>
            <div style={sBarItem}>
                <select
                    value={loginStorage.workspaceAddress || 'null'}
                    onChange={(e) => loginStorage.setWorkspace(e.target.value == 'null' ? null : e.target.value)}
                    >
                    <option value="null">(no workspace)</option>
                    {sorted(notNull(loginStorage.history.workspaceAddresses)).map(wa => {
                        let [name, key] = wa.split('.');
                        let waShort = wa;
                        if (key.length > 6) {
                            waShort = name + '.' + key.slice(0, 6) + '...';
                        }
                        return <option key={wa} value={wa}>{waShort}</option>
                    })}
                </select>
            </div>
            <div style={sBarItem}>
                <select
                    value={loginStorage.authorKeypair == null ? 'null' : loginStorage.authorKeypair.address}
                    onChange={(e) => loginStorage.setAuthorAddress(e.target.value == 'null' ? null : e.target.value)}
                    >
                    <option value="null">(no author)</option>
                    {sorted(notNull(loginStorage.history.authorKeypairs).map(kp => kp.address)).map(authorAddress =>
                        <option key={authorAddress} value={authorAddress}>{authorAddress.slice(0, 6 + 6) + '...'}</option>
                    )}
                </select>
            </div>
            <div style={sBarSpacer}/>
            <div style={sBarItem}>
                <i>3 servers</i>
                <button type="button">sync now</button>
            </div>
        </div>
    }
}

//================================================================================

let loginStorage = new LoginStorage();

//let demoKeypairs : AuthorKeypair[] = [
//    {
//        address: "@abcd.Evwdch1up4ecf3bxNjaKFy9CEZpizLPreYu3J7tQELUw",
//        secret: "6qdayaEK2uiDZknVVNuz7PfcbCNaT3yDzd3b3GBw5pAo"
//    },
//    {
//        address: "@suzy.D79SNKuFsNKGhHgzGsvWG9V8JQG8MwyjSrvkjDQ2mVZD",
//        secret: "2nwvseUKu6mxSFu3YnFCdTFw5Pyud1aBW997XCVs6LDn"
//    },
//    {
//        address: "@fooo.A14CghnKZSsEiShRfgPHPQpstWsLfqFELGwinyPCPzaK",
//        secret: "HDGn792ZFeAa2HWpWRBhVGsb7uQJKwxUT4wSKvJxcgSf"
//    }
//]
//demoKeypairs.forEach(kp => loginStorage.setAuthorKeypair(kp));
//loginStorage.setAuthorKeypair(null);
//
//loginStorage.setWorkspace('+sailing.xxxxxxxxxxx');
//loginStorage.setWorkspace('+gardening.xxxxxxxxxx');
//loginStorage.setWorkspace('+solarpunk.xxxxxxx');
//loginStorage.setWorkspace('+aaaaabbbbbccccc.xxxxxxx');
//loginStorage.setWorkspace('+unlisted.xxxxxxxxxxxxxxxxxxxx');
//loginStorage.setWorkspace('+invite.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
//loginStorage.setWorkspace('+z.z');
//loginStorage.setWorkspace('+blip.blorp');
//loginStorage.setWorkspace(null);

ReactDOM.render(
    <LoginBarView loginStorage={loginStorage} />,
    document.getElementById('react-slot')
);
