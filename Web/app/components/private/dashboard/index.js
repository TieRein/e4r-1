import React from "react";
import { NavLink } from "react-router-dom";
import Styles from "./style.css";
import Routes from "../routes";

const Dashboard = props => (
    <div className={Styles.dashboard}>
        <div className={Styles.selectors}>
            {Routes.map((elem, index)=>(
                <NavLink key={index} exact={elem.exact} to={elem.path} className={Styles.dlinks} activeClassName={Styles.dlinkactive}>{elem.icon}<span className={Styles.linktext}>{elem.label}</span></NavLink>
            ))}
            <div className={Styles.logout} onClick={props.func.logout}><i className={["fa", "fa-sign-out", Styles.icons].join(" ")} aria-hidden="true"/><span className={Styles.linktext}>Logout</span></div>
        </div>
    </div>
);

export default Dashboard;
