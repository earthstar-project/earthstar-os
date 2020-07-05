import * as React from 'react';
import {
    randomColor,
} from './util';

export class RainbowBug extends React.Component<{name?: string}, any> {
    colors : string[] = ['white', 'white', 'white', 'white', 'white', 'white', 'white'];
    render() {
        this.colors.unshift(randomColor());
        this.colors.pop();
        return <div style={{
                backgroundColor: this.colors[0],
                display: 'inline-block',
                padding: 5,
                borderRadius: 3,
                marginRight: 10,
            }}>
            {this.props.name ? this.props.name + ' ' : null}
            {this.colors.map((c, ii) => <div key={ii} style={{
                display: 'inline-block',
                height: '1.2em',
                width: '0.5em',
                backgroundColor: c,
                border: '1px solid black',
            }}></div>)}
        </div>
    }
}