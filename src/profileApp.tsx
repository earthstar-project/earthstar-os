import * as React from 'react';
import {
    Document,
    Pub,
} from 'earthstar'
import throttle = require('lodash.throttle');

import { Thunk } from './types';
import {
    randomColor,
} from './util';
import { EarthstarRouter } from './router';
import { AppProps } from './appSwitcher';
import { Emitter, subscribeToMany } from './emitter';
import { RainbowBug } from './rainbowBug';

let logProfileApp = (...args : any[]) => console.log('ProfileApp |', ...args);

//================================================================================

let sPage : React.CSSProperties = {
    margin: 40,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#e4e4e4',
}

export class ProfileApp extends React.Component<AppProps, any> {
    unsub : Thunk | null = null;
    componentDidMount() {
        logProfileApp('subscribing to router changes');
        let router = this.props.router;
        this.unsub = subscribeToMany<any>(
            [
                router.onParamsChange,  // expects an optional "author" param, which can be "me"
                router.onWorkspaceChange,
                router.onStorageChange,
            ],
            throttle(() => this.forceUpdate(), 200)
        );
    }
    componentWillUnmount() {
        if (this.unsub) { this.unsub(); }
    }
    render() {
        let router = this.props.router;
        if (router.workspace === null) {
            return <div style={sPage}>
                Choose a workspace
            </div>;
        }
        let layerAbout = router.workspace.layerAbout;

        let subject = router.params.author;
        let isMe = false;
        if (router.authorKeypair !== null) {
            let myAddress = router.authorKeypair.address;
            if (!subject || subject === "me") {
                subject = myAddress;
            }
            isMe = subject === myAddress;
        }

        if (!subject) {
            return <div style={sPage}>
                Choose an author
            </div>;
        }

        let info = layerAbout.getAuthorInfo(subject);
        if (info === null) {
            return <div style={sPage}>
                Unparsable author name: <code>{JSON.stringify(subject)}</code>
            </div>;
        }
        return <div style={sPage}>
            <h2>Profile</h2>
            {isMe ? <p><i>This is you</i></p> : null}
            <p><code><b>@{info.shortname}</b><i>.{info.pubkey}</i></code></p>
            <p>Shortname: <b>{info.shortname}</b></p>
            <p>Longname: <b>{info.profile.longname || '(none)'}</b></p>
            <h4>Info</h4>
            <pre>{JSON.stringify(info, null, 4)}</pre>
        </div>;
    }
}
