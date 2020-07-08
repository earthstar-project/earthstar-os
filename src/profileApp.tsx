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
    padding: 15,
}

export class ProfileApp extends React.Component<AppProps, any> {
    unsub : Thunk | null = null;
    componentDidMount() {
        logProfileApp('subscribing to router changes');
        let router = this.props.router;
        this.unsub = subscribeToMany<any>(
            [
                //router.onParamsChange,
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
        if (router.authorKeypair === null) {
            return <div style={sPage}>
                Choose an author
            </div>;
        }
        let layerAbout = router.workspace.layerAbout;
        let info = layerAbout.getAuthorInfo(router.authorKeypair.address);
        let shortname = info ? info.shortname : '(none)';
        let pubkey = info ? info.pubkey : '(none)';
        let longname = info?.profile.longname || '(none)';
        return <div style={sPage}>
            <h3>My profile</h3>
            <p><code><b>@{shortname}</b><i>.{pubkey}</i></code></p>
            <p>Author Address: <code>{router.authorKeypair.address}</code></p>
            <p>Password: <code>{router.authorKeypair.secret}</code></p>
            <p>Shortname: <b>{shortname}</b></p>
            <p>Longname: <b>{longname}</b></p>
            <h4>Profile info</h4>
            <pre>{JSON.stringify(info, null, 4)}</pre>
        </div>;
    }
}
