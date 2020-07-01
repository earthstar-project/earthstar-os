import * as React from 'react';
import * as ReactDOM from 'react-dom';

const AppView : React.FunctionComponent<any> = (props) =>
    <h1>Hello</h1>;

ReactDOM.render(
    <AppView />,
    document.getElementById('react-slot')
);
