import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
    AuthorAddress,
    Workspace,
    WorkspaceAddress,
    AuthorKeypair,
} from 'earthstar';
import { Emitter } from './emitter';
import { PassThrough } from 'stream';
import { sleep } from './util';
let log = console.log;

//================================================================================

type Params = { [key:string] : string };

let getHashParams = () : Params => {
    if (!window.location.hash) { return {}; }
    let params : { [key:string] : string } = {};
    let USParams = new URLSearchParams(window.location.hash.slice(1)); // remove leading '#'
    for (let [k,v] of USParams.entries()) {
        params[k] = v;
    }
    return params;
}
let setHashParams = (params : Params) : void => {
    let newHash = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    log('setting hash to', params);
    log('setting hash to', newHash);
    window.location.hash = newHash;
}

//================================================================================

let LOGINS_LOCALSTORAGE_KEY = 'earthstar-logins';
type Logins = {
    // most recent user first, per workspace
    // an author of null means guest mode
    // the array should never be empty
    [workspace : string] : Array<AuthorKeypair | null>;
}


// expected url hash params:
// #workspace=gardening.xxxx
// note no plus on the workspace address, because it has to be percent-encoded.
// if workspace is null, it's absent from the url hash.
class LoginStorage {
    // if workspace is null, author is also always null
    workspaceAddress : WorkspaceAddress | null;
    authorKeypair : AuthorKeypair | null;
    _logins : Logins;
    onChange : Emitter<undefined>;
    constructor() {
        log('LoginStorage constructor');
        this.onChange = new Emitter<undefined>();
        this._logins = {};
        // load _logins from localStorage
        let raw = localStorage.getItem(LOGINS_LOCALSTORAGE_KEY);
        if (raw) {
            try {
                this._logins = JSON.parse(raw);
            } catch (e) {
            }
        }
        log('..._logins:', this._logins);
        // load workspaceAddress from hash params
        this.workspaceAddress = getHashParams().workspace || null;
        if (this.workspaceAddress) {
            // restore '+'
            this.workspaceAddress = this.workspaceAddress.trim();
            if (!this.workspaceAddress.startsWith('+')) { this.workspaceAddress = '+' + this.workspaceAddress; }
        }
        log('...loaded workspace from hash:', this.workspaceAddress);
        if (this.workspaceAddress === null) {
            this.authorKeypair = null;
        } else {
            // load latest author from _logins for this workspace
            let authorsForThisWorkspace = this._logins[this.workspaceAddress] || [];
            this.authorKeypair = authorsForThisWorkspace[0] || null;
            // add this workspace to _logins if it's not there
            if (this._logins[this.workspaceAddress] === undefined) {
                log('...this is a new workspace; saving it to logins with a null author');
                this._logins[this.workspaceAddress] = [null];
                this._saveLogins();
            }
        }
        log('...loaded author from _logins:', this.authorKeypair);
    }
    _saveLogins() {
        log('    saving _logins');
        localStorage.setItem(LOGINS_LOCALSTORAGE_KEY, JSON.stringify(this._logins));
    }
    setWorkspaceAndAuthor(workspaceAddress : WorkspaceAddress | null, authorKeypair : AuthorKeypair | null) {
        log('set workspace to ' + workspaceAddress + ' and author to ' + (authorKeypair?.address || 'null'));
        if (workspaceAddress === null && authorKeypair !== null) { throw new Error("null workspace must have null author"); }

        this.workspaceAddress = workspaceAddress;
        this.authorKeypair = authorKeypair;

        if (workspaceAddress === null) {
            // don't need to update _logins.
            // update hash params.
            log('...removing workspace from hash params');
            let params = getHashParams();
            delete params.workspace;
            setHashParams(params);
        } else {
            // update _logins to move author to the beginning of the authors list
            log('...setting author as most recent author for this workspace');
            this._logins[workspaceAddress] = (this._logins[workspaceAddress] || []).filter(a => a !== authorKeypair);
            this._logins[workspaceAddress].unshift(authorKeypair);
            this._saveLogins();
            // update hash params
            log('...setting workspace in hash params');
            let params = getHashParams();
            params.workspace = workspaceAddress.slice(1);  // remove '+'
            setHashParams(params);
        }
        this.onChange.send(undefined);
    }
}

//================================================================================

let sBar : React.CSSProperties = {
    display: 'flex',
    padding: 10,
    borderBottom: '2px solid #5e4d76',
}
let sBarItem : React.CSSProperties = {
    flexGrow: 1,
    flexShrink: 1,
}

type LoginBarProps = {
    loginStorage : LoginStorage,
}
const LoginBarView : React.FunctionComponent<LoginBarProps> = (props) => {
    let wsAddress = props.loginStorage.workspaceAddress;
    let authorAddress = props.loginStorage.authorKeypair?.address;
    return <div style={sBar}>
        {wsAddress
          ? <div style={sBarItem}><b>{wsAddress}</b></div>
          : <div style={sBarItem}><a href="">choose a workspace</a></div>
        }
        {authorAddress
          ? <div style={sBarItem}><b>{authorAddress}</b></div>
          : <div style={sBarItem}>guest mode. <a href="">log in</a></div>
        }
        <div style={sBarItem}><a href="/apps">apps</a></div>
        <div style={sBarItem}><i>syncing with 3 servers</i></div>
    </div>
}

//================================================================================

let loginStorage = new LoginStorage();

ReactDOM.render(
    <LoginBarView loginStorage={loginStorage} />,
    document.getElementById('react-slot')
);
