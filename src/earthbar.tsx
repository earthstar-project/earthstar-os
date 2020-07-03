import * as React from 'react';

import { notNull, sorted } from './util';
import { Thunk } from './types';

import { EarthstarRouter } from './router';

let logEarthbar = (...args : any[]) => console.log('Earthbar |', ...args);

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
let sSelect : React.CSSProperties = {
    width: '100%',
    height: 40,
    fontSize: '100%',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: 0,
    backgroundColor: 'white',
    border: 'none',
    color: 'black',
    appearance: 'none',
    MozAppearance: 'none',
    WebkitAppearance: 'none',
}

interface EarthbarProps {
    router : EarthstarRouter;
}
export class Earthbar extends React.Component<EarthbarProps, any> {
    unsub : Thunk | null = null;
    componentDidMount() {
        logEarthbar('subscribing to router changes');
        this.unsub = this.props.router.onChange.subscribe(() => {
            logEarthbar('Earthbar: router changed; re-rendering');
            this.forceUpdate();
        });
    }
    componentWillUnmount() {
        if (this.unsub) { this.unsub(); }
    }
    _syncButton() {
        logEarthbar('sync button was pressed');
        if (this.props.router.workspace) {
            this.props.router.workspace.syncer.sync();
        }
    }
    render() {
        logEarthbar('render');
        let router = this.props.router;
        let numPubs = router.workspace === null ? 0 : router.workspace.syncer.state.pubs.length;
        let canSync = router.workspace !== null && numPubs > 0;
        return <div style={sBar}>
            <div style={sBarItem}>
                <select style={sSelect}
                    value={router.workspaceAddress || 'null'}
                    onChange={(e) => router.setWorkspace(e.target.value == 'null' ? null : e.target.value)}
                    >
                    <option value="null">(no workspace)</option>
                    {sorted(notNull(router.history.workspaceAddresses)).map(wa => {
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
                <select style={sSelect}
                    value={router.authorKeypair == null ? 'null' : router.authorKeypair.address}
                    onChange={(e) => router.setAuthorAddress(e.target.value == 'null' ? null : e.target.value)}
                    >
                    <option value="null">(no author)</option>
                    {sorted(notNull(router.history.authorKeypairs).map(kp => kp.address)).map(authorAddress =>
                        <option key={authorAddress} value={authorAddress}>{authorAddress.slice(0, 6 + 6) + '...'}</option>
                    )}
                </select>
            </div>
            <div style={sBarSpacer}/>
            <div style={sBarItem}>
                <i>{numPubs} pubs </i>
                <button type="button"
                    onClick={() => this._syncButton()}
                    disabled={!canSync}
                    >
                    Sync now
                </button>
            </div>
        </div>
    }
}
