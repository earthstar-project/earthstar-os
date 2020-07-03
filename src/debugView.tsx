import * as React from 'react';
import {
    Document
} from 'earthstar'

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
        this.unsub = this.props.router.onChange.subscribe(() => {
            logDebug('Earthbar: router changed; re-rendering');
            this.forceUpdate();
        });
    }
    componentWillUnmount() {
        if (this.unsub) { this.unsub(); }
    }
    render() {
        logDebug('render');
        let router = this.props.router;
        let workspace = router.workspace;
        let docs : Document[] = workspace === null ? [] : workspace.storage.documents({ includeHistory: false });
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
            <h3>docs</h3>
            {docs.length === 0
              ? <div>(no docs)</div>
              : docs.map(doc =>
                    <div>
                        <div><b><code>{doc.path}</code></b></div>
                        <div><pre>{doc.value}</pre></div>
                    </div>
                )
            }
        </div>;
    }
}

