import React from 'react';

export default class errorPath extends React.Component {
    constructor(props) {
        super(props);
        this.pathName = "";
    }
    componentWillMount() {
        this.pathName = window.location.pathname;
    }
    render() {
        return (
            <div id='error-con'>
                <section id="error">
                    <center><img src='/app/assets/backgrounds/error.png' alt='Oppsies' width="300px" height="200px"></img></center>
                    <center><h1 className="error-header">404</h1> </center>
                    <center><h2 className="error-header">'{this.pathName}' NOT FOUND!</h2></center>  
                </section>
            </div>
        );
    }
};