/****************************************************************************
 * 
 *->Name: App.js 
 *->Purpose: React Component root of routers and Navagation component.
 *
*****************************************************************************/
import React from "react"; // eslint-disable-line no-unused-vars
import {
	BrowserRouter,
	Route// eslint-disable-line no-unused-vars
} from "react-router-dom";
import {connect} from "react-redux";
import { bindActionCreators } from "redux";
import { handleUserPersist } from "../../redux/actions/user";
import Navagations from "./navagations"; // eslint-disable-line no-unused-vars
import Routes from "./routes";
import PrivateRoute from "./routes/private";
import Private from "../private";
import Spinner from "../loading";
import EFRapi from "../../libraries/efrApi";
import Styles from "./style.css";
import SpinnerStyle from "../loading/style.css";

class App extends React.Component {
	constructor(props) {
		super(props);
	}
	componentDidMount() {
		const Loading = document.getElementsByClassName(SpinnerStyle.spinnercontainer)[0];
		Loading.style.display = "none";
		if (!this.props.states.redirectToRefer) {
			this.props.handleUserPersist();
		}
	}
	render() {
		return (
			<BrowserRouter>
				<div className={Styles.container}>
					<Spinner/>
					<div>
						<Navagations/>
					</div>
					{Routes.map((elem, index)=>(
						<Route key={index} exact={elem.exact} path={elem.path} component={elem.component}/>
					))}
					<PrivateRoute path="/dashboard" states={this.props.states} component={Private}/>
				</div>
			</BrowserRouter> 
		)
	}
}

export default connect(
	(state) => ({states: state.state}),
	(dispatch) => bindActionCreators({ handleUserPersist }, dispatch)
)(App);