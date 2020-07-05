import deepEqual = require('fast-deep-equal');
import debounce = require('lodash.debounce');
import {
    AuthorAddress,
    AuthorKeypair,
    Emitter,
    StorageMemory,
    ValidatorEs3,
    WorkspaceAddress,
} from 'earthstar';

import { Thunk } from './types';
import { Workspace } from './workspace';

let logRouter = (...args : any[]) => console.log('Router |', ...args);

//================================================================================

export type HashParams = { [key:string] : string };

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
    logRouter('setting hash to', params);
    logRouter('setting hash to', newHash);
    window.location.hash = newHash;
}

//================================================================================

let LOGIN_HISTORY_LOCALSTORAGE_KEY = 'earthstar-logins';
type EarthstarLoginHistory = {
    workspaceAddresses : (WorkspaceAddress | null)[];  // most recent first
    authorKeypairs : (AuthorKeypair | null)[];  // most recent first.  null = guest mode
    // servers : string[];  // TODO
}

// expected url hash params:
// #workspace=gardening.xxxx
// note we omit the plus on the workspace address because it would have to be percent-encoded.
// if workspace is null, it's absent from the url hash.
export class EarthstarRouter {
    workspaceAddress : WorkspaceAddress | null = null;
    authorKeypair : AuthorKeypair | null = null;
    history : EarthstarLoginHistory;
    params : HashParams;
    workspace : Workspace | null = null;
    onWorkspaceChange : Emitter<undefined>;  // when the overall workspace or author is switched
    onStorageChange : Emitter<undefined>;  // when documents change in the workspace
    onSyncerChange : Emitter<undefined>;  // when the syncing state changes
    unsubWorkspaceStorage : Thunk | null = null;
    unsubWorkspaceSyncer : Thunk | null = null;
    constructor() {
        logRouter('constructor');
        this.onWorkspaceChange = new Emitter<undefined>();
        this.onStorageChange = new Emitter<undefined>();
        this.onSyncerChange = new Emitter<undefined>();
        this.params = getHashParams();
        window.addEventListener('hashchange', () => {   // TEMP HACK
            this._handleHashChange();
        }, false);

        this.history = {
            workspaceAddresses: [null],
            authorKeypairs: [null],
        }
        this._loadHistoryFromLocalStorage();

        this._loadWorkspaceAddressFromHash();
        this._loadAuthorFromHistory();
        this._buildWorkspace();
    }
    _buildWorkspace() {
        // unsubscribe from old workspace events
        if (this.unsubWorkspaceStorage) { this.unsubWorkspaceStorage(); }
        if (this.unsubWorkspaceSyncer) { this.unsubWorkspaceSyncer(); }
        this.unsubWorkspaceStorage = null;
        this.unsubWorkspaceSyncer = null;

        if (this.workspaceAddress === null) {
            this.workspace = null;
        } else {
            let validator = ValidatorEs3;
            let storage = new StorageMemory([ValidatorEs3], this.workspaceAddress);
            this.workspace = new Workspace(storage, this.authorKeypair);

            // HACK until router remembers pubs in localStorage - add some demo pubs
            this.workspace.syncer.addPub('http://localhost:3333');
            this.workspace.syncer.addPub('https://cinnamon-bun-earthstar-pub3.glitch.me/');

            // HACK to persist the memory storage to localStorage
            let localStorageKey = `earthstar-${validator.format}-${this.workspaceAddress}`;
            let existingData = localStorage.getItem(localStorageKey);
            if (existingData !== null) {
                storage._docs = JSON.parse(existingData);
            }
            // saving will get triggered on every incoming document, so we should debounce it
            // (wait until no changes for X milliseconds, then save)
            let saveToLocalStorage = () => {
                logRouter('saving StorageMemory to localStorage =====================================');
                localStorage.setItem(localStorageKey, JSON.stringify(storage._docs));
            };
            let debouncedSave = debounce(saveToLocalStorage, 100, { trailing: true });
            storage.onChange.subscribe(debouncedSave);
            // END LOCALSTORAGE HACK

            // pipe workspace's change events through to the router's change events
            this.unsubWorkspaceStorage = this.workspace.storage.onChange.subscribe(() => this.onStorageChange.send(undefined));
            this.unsubWorkspaceSyncer = this.workspace.syncer.onChange.subscribe(() => this.onSyncerChange.send(undefined));
        }
    }
    _handleHashChange() {
        logRouter('_handleHashChange');
        let changed : boolean = false;
        let newParams = getHashParams();
        if (this.params.workspace !== newParams.workspace) {
            logRouter('...workspace changed');
            this._loadWorkspaceAddressFromHash();
            this._buildWorkspace();
            changed = true;
        }
        if (!deepEqual(newParams, this.params)) {
            logRouter('...anything changed; sending onChange');
            this.params = newParams;
            changed = true;
        }
        if (changed) {
            this.onWorkspaceChange.send(undefined);
        }
    }
    _loadHistoryFromLocalStorage() {
        let raw = localStorage.getItem(LOGIN_HISTORY_LOCALSTORAGE_KEY);
        if (raw) {
            try {
                this.history = JSON.parse(raw);
            } catch (e) {
            }
        }
        logRouter('...history:', this.history);
    }
    _loadWorkspaceAddressFromHash() {
        logRouter('_loadWorkspaceAddressFromHash');
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
        logRouter('...loaded workspace from hash:', this.workspaceAddress);
    }
    _loadAuthorFromHistory() {
        if (this.history.authorKeypairs.length == 0) {
            this.history.authorKeypairs = [null];
        }
        this.authorKeypair = this.history.authorKeypairs[0];
        logRouter('...loaded author from history: ', this.authorKeypair);
    }
    _saveHistory() {
        logRouter('        saving history');
        localStorage.setItem(LOGIN_HISTORY_LOCALSTORAGE_KEY, JSON.stringify(this.history));
    }
    setWorkspace(workspaceAddress : WorkspaceAddress | null) {
        logRouter('setWorkspace(' + workspaceAddress + ')');
        this.workspaceAddress = workspaceAddress;
        // update history to move workspace to the beginning of the list (most recent)
        logRouter('...updating history');
        this.history.workspaceAddresses = this.history.workspaceAddresses.filter(w => w !== workspaceAddress);
        this.history.workspaceAddresses.unshift(workspaceAddress);
        this._saveHistory();
        // rebuild workspace
        this._buildWorkspace();
        // update hash params.
        if (workspaceAddress === null) {
            logRouter('...removing workspace from hash params');
            delete this.params.workspace;
        } else {
            logRouter('...updating workspace in hash params');
            this.params.workspace = workspaceAddress.slice(1);  // remove '+'
        }
        setHashParams(this.params);
        this.onWorkspaceChange.send(undefined);
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
        logRouter('setAuthorKeypair:', authorKeypair);
        this.authorKeypair = authorKeypair;

        // update history to move author to the beginning of the list (most recent)
        // note that the authorKeypair list includes a null representing guest mode
        logRouter('...updating history');
        this.history.authorKeypairs = this.history.authorKeypairs.filter(a => !deepEqual(a, authorKeypair));
        this.history.authorKeypairs.unshift(authorKeypair);
        this._saveHistory();

        // rebuild workspace
        this._buildWorkspace();

        this.onWorkspaceChange.send(undefined);
    }
}
