import * as React from 'react';
import {
    Document,
    Pub,
    AuthorProfile,
    AuthorInfo,
    AuthorAddress,
} from 'earthstar'
import throttle = require('lodash.throttle');
import deepEqual = require('fast-deep-equal');

import { Thunk } from './types';
import {
    randomColor, sortByKey, sortedByKey,
} from './util';
import { EarthstarRouter } from './router';
import { AppProps } from './appSwitcher';
import { Emitter, subscribeToMany } from './emitter';
import { RainbowBug } from './rainbowBug';

import { theme } from './base16/base16-atelier-heath-light';

let logProfileApp = (...args : any[]) => console.log('ProfileApp |', ...args);

//================================================================================

let cRed = theme.base08;
let cOrange = theme.base09;
let cYellow = theme.base0A;
let cGreen = theme.base0B;
let cCyan = theme.base0C;
let cBlue = theme.base0D;
let cViolet = theme.base0E;
let cMagenta = theme.base0F;

let cCardBg = theme.base00;
let cPageBg = theme.base02;
let cText = theme.base07;
let cButtonBg = cViolet;
let cButtonText = theme.base00;

let sPage : React.CSSProperties = {
    padding: 20,
    paddingTop: 40,
    minHeight: '105vh',
    backgroundColor: cPageBg,
    color: cText,
    fontFamily: 'Georgia, serif',
    position: 'relative',
}
let sColumn : React.CSSProperties = {
    maxWidth: '40rem',
    marginLeft: 'auto',
    marginRight: 'auto',
}
let sCard : React.CSSProperties = {
    padding: 20,
    borderRadius: 10,
    backgroundColor: cCardBg,
    position: 'relative',
}
let sButton : React.CSSProperties = {
    //padding: 10,
    height: '2em',
    //marginLeft: 15,
    borderRadius: 10,
    background: cButtonBg,
    color: cButtonText,
    border: 'none',
    fontSize: 'inherit',
}

interface ProfileAppState {
    isEditing : boolean;
    editedProfile : AuthorProfile;
}
export class ProfileApp extends React.Component<AppProps, ProfileAppState> {
    unsub : Thunk | null = null;
    constructor(props : AppProps) {
        super(props);
        this.state = {
            isEditing: false,
            editedProfile: {},
        }
    }
    componentDidMount() {
        logProfileApp('subscribing to router changes');
        let router = this.props.router;
        this.unsub = subscribeToMany<any>(
            [
                router.onParamsChange,  // expects an optional "author" param, which can be "me"
                router.onWorkspaceChange,
                router.onStorageChange,
            ],
            throttle(() => {
                logProfileApp('throttled event handler is running, about to render.');
                this.forceUpdate()
            }, 200)
        );
    }
    componentWillUnmount() {
        logProfileApp('unsubscribing to router changes');
        if (this.unsub) { this.unsub(); }
    }
    _startEditing(profile : AuthorProfile) {
        this.setState({
            isEditing: true,
            editedProfile: {...profile},
        });
    }
    _saveEdits(oldProfile : AuthorProfile) {
        logProfileApp('_saveEdits: begin');
        if (deepEqual(this.state.editedProfile, oldProfile)) {
            logProfileApp('_saveEdits: ...nothing was changed.  cancelling.');
            this._clearEdits();
            logProfileApp('_saveEdits: ...done');
            return;
        }
        let workspace = this.props.router.workspace;
        let keypair = this.props.router.authorKeypair;
        let profile = this.state.editedProfile;
        if (!profile.longname) { delete profile.longname; }
        if (!profile.hue) { delete profile.hue; }
        if (!profile.bio) { delete profile.bio; }
        if (workspace && keypair) {
            logProfileApp('_saveEdits: ...saving to workspace storage');
            workspace.layerAbout.setMyAuthorProfile(keypair, profile);
        }
        logProfileApp('_saveEdits: ...setting react state');
        this._clearEdits();
        logProfileApp('_saveEdits: ...done');
    }
    _clearEdits() {
        this.setState({
            isEditing: false,
            editedProfile: {},
        });
    }
    render() {
        logProfileApp('render');
        let router = this.props.router;

        // not in a workspace?  show an error
        if (router.workspace === null) {
            return <div style={sPage}><div style={sColumn}>
                <RainbowBug position='topLeft' />
                <h2>Profile</h2>
                <div style={sCard}>
                    (Choose a workspace)
                </div>
            </div></div>;
        }
        let layerAbout = router.workspace.layerAbout;

        // the subject is the author to display the profile for.
        // get it from the router params...
        let subject = router.params.author;
        if (!subject || subject === 'me') {
            // if router params are missing or "me", use the current logged-in user as the subject
            if (router.authorKeypair !== null) {
                subject = router.authorKeypair.address;
            }
        }

        // we couldn't figure out who the subject is?  show an error
        if (!subject || subject === 'me') {
            return <div style={sPage}><div style={sColumn}>
                <RainbowBug position='topLeft' />
                <h2>Profile</h2>
                <div style={sCard}>
                    (Choose an author)
                </div>
            </div></div>;
        }

        // look up info for the subject
        let subjectInfoOrNull = layerAbout.getAuthorInfo(subject);
        if (subjectInfoOrNull === null) {
            // malformed subject author address, show an error
            return <div style={sPage}><div style={sColumn}>
                <RainbowBug position='topLeft' />
                <h2>Profile</h2>
                <div style={sCard}>
                    (Unparsable author name: <code>{JSON.stringify(subject)}</code>)
                </div>
            </div></div>;
        }
        let subjectInfo = subjectInfoOrNull;

        // get the logged-in user's info
        let myInfoOrNull : AuthorInfo | null = null;
        let isMe = false;
        if (router.authorKeypair !== null) {
            myInfoOrNull = layerAbout.getAuthorInfo(router.authorKeypair.address);
            isMe = subject === router.authorKeypair.address;
        }

        let subjectHue = typeof subjectInfo.profile.hue === 'number' ? subjectInfo.profile.hue : null;
        let subjectColor = (subjectHue === null) ? '#aaa' : `hsl(${subjectHue}, 50%, 50%)`;

        let isEditing = this.state.isEditing;

        // make list of authors, for dropdown
        // authors come from 3 sources:
        //   authors who have written into this workspace
        //   the subject (from the hash params), may or may not have written in the workspace
        //   the logged-in author, may or may not have written in the workspace
        let addAuthorToList = (arr : AuthorInfo[], authorInfo : AuthorInfo | null) : void => {
            if (authorInfo === null) { return; }
            for (let a of arr) {
                if (a.address === authorInfo.address) { return; }
            }
            arr.push(authorInfo);
        }
        let allAuthorInfos = layerAbout.listAuthorInfos();
        addAuthorToList(allAuthorInfos, myInfoOrNull);
        addAuthorToList(allAuthorInfos, subjectInfo);
        sortByKey(allAuthorInfos, info => info.address);

        return <div style={sPage}><div style={sColumn}>
            <RainbowBug position='topLeft' />
            <h2>Profile</h2>
                {/* author switcher dropdown */}
                {allAuthorInfos.length === 0
                ? null
                : <p>
                        <select value={subjectInfo.address}
                            onChange={(e) => {
                                if (e.target.value === '') { return; }  // spacer
                                logProfileApp('change author hash param to:', e.target.value);
                                router.setParams({...router.params, author: e.target.value});
                            }}
                            >
                            {allAuthorInfos.map(authorInfo =>
                                <option key={authorInfo.address} value={authorInfo.address}>
                                    @{authorInfo.shortname}.{authorInfo.pubkey.slice(0, 10)}...{authorInfo.profile.longname ? ' -- ' + authorInfo.profile.longname : null}
                                </option>
                            )}
                        </select>
                    </p>
                }
            <div style={sCard}>

                {/* profile pic */}
                <p>
                    <span style={{
                        display: 'inline-block',
                        width: 100,
                        height: 100,
                        borderRadius: 100,
                        backgroundColor: subjectColor,
                    }}/>
                </p>

                {/* edit buttons */}
                {isMe ? <p>
                    <i>This is you. </i>
                    {isEditing
                    ? <button style={sButton} onClick={() => this._saveEdits(subjectInfo.profile)}>
                        Save
                    </button>
                    : <button style={sButton} onClick={() => this._startEditing(subjectInfo.profile)}>
                        Edit
                    </button>
                    }
                </p> : null}

                {/* shortname and longname */}
                <p><code><b style={{fontSize: '1.25em'}}>@{subjectInfo.shortname}</b><i>.{subjectInfo.pubkey}</i></code></p>
                <p style={{fontSize: '1.25em'}}>{
                    isEditing
                    ? <input type="text"
                            style={{width: '50%', padding: 5, fontWeight: 'bold'}}
                            placeholder="(none)"
                            value={this.state.editedProfile.longname || ''}
                            onChange={(e: any) => this.setState({editedProfile: {...this.state.editedProfile, longname: e.target.value}})}
                            />
                    : <b>{subjectInfo.profile.longname || '(no longname set)'}</b>
                    }
                </p>
                {/* json view */}
                <hr />
                <pre>{JSON.stringify(subjectInfo, null, 4)}</pre>
            </div>
        </div></div>;
    }
}
