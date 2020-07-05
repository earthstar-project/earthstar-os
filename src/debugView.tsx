import * as React from 'react';
import {
    Document,
    Pub,
    subscribeToMany,
} from 'earthstar'
import throttle = require('lodash.throttle');

import { Thunk } from './types';
import { EarthstarRouter } from './router';

let logDebug = (...args : any[]) => console.log('DebugView |', ...args);

//================================================================================

let sPage : React.CSSProperties = {
    padding: 15,
}
interface DebugViewProps {
    router : EarthstarRouter;
}
export class DebugView extends React.Component<DebugViewProps, any> {
    unsub : Thunk | null = null;
    componentDidMount() {
        logDebug('subscribing to router changes');
        let router = this.props.router;
        this.unsub = subscribeToMany(
            [router.onWorkspaceChange, router.onStorageChange, router.onSyncerChange],
            throttle(() => this.forceUpdate(), 100)
        );
    }
    componentWillUnmount() {
        if (this.unsub) { this.unsub(); }
    }
    render() {
        logDebug('render');
        let router = this.props.router;
        let workspace = router.workspace;
        let docs : Document[] = workspace === null ? [] : workspace.storage.documents({ includeHistory: false });
        let pubs : Pub[] = workspace === null ? [] : workspace.syncer.state.pubs;
        return <div style={sPage}>
            <h3>params</h3>
            <pre>{JSON.stringify(router.params, null, 4)}</pre>
            <h3>workspace</h3>
            <code>{router.workspaceAddress || 'null'}</code>
            <h3>author</h3>
            <pre>{JSON.stringify(router.authorKeypair, null, 4)}</pre>
            <h3>workspace</h3>
            {workspace === null
              ? <div>(no workspace)</div>
              : <div>
                    <pre>workspace address: {workspace.address}</pre>
                    <pre>author address: {workspace.authorKeypair?.address || '(no author)'}</pre>
                </div>
            }
            <h3>workspace.pubs</h3>
            {pubs.length === 0
              ? <div>(no pubs)</div>
              : pubs.map(pub =>
                    <pre key={pub.domain}>{JSON.stringify(pub, null, 4)}</pre>
                )
            }
            <h3>workspace.docs</h3>
            {docs.length === 0
              ? <div>(no docs)</div>
              : docs.map(doc =>
                    <div key={doc.path + '^' + doc.author}>
                        <div><b><code>{doc.path}</code></b></div>
                        <div><pre>{doc.value}</pre></div>
                    </div>
                )
            }
        </div>;
    }
}

