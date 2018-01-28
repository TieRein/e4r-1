import "babel-polyfill";

import { 
	SET_USER_INFO,
	SET_SESSION_TOKEN,
	AUTHENTICATING, 
	DEAUTHENTICATING,
	PERSIST,
	SET_UID } from "../types";
import {
	Error,
	Refer, 
	setAuthenticateSuccess,
	setSignUpSuccessful,
	Reset,
	ifSignUp} from "./state";
import httpCodes from "../httpCodes";
import iAuth from "../../libraries/iAuth";
import iCookie from "../../libraries/iCookie";

export function setUID(name) {
	return {
		type: SET_UID,
		value: name
	}
}

export function setSessionToken(token) {
	return {
		type: SET_SESSION_TOKEN,
		session: token,
	};
}

export function Authenticate(state) {
	return {
		type: AUTHENTICATING,
		value: state	
	};
}

export function DeAuthenticate() {
	return {
		type: DEAUTHENTICATING
	};
}

export function handlerPersist() {
	return async (dispatch)=>{
		try {
			const result = await iAuth.ifPersist();
			if (result.data.code === httpCodes.Ok) {
				dispatch(setAuthenticateSuccess(true));
				dispatch(setUID(result.data.uid ? result.data.uid : iCookie.get("uid")));
				const expire = "expires=" + iCookie.time();
				const cookie = "session=" + result.data.session_id + ";" + expire + ";path=/";
				iCookie.set(cookie);
				dispatch(Refer());
			}
		}
		catch(error) {
			dispatch(Error("PERSIST_ERROR"));
		}
	}
}

export function handlerAuth(user=undefined) {
	return async (dispatch)=>{
		try {
			dispatch(Error());
			dispatch(setSignUpSuccessful(false));
			dispatch(Authenticate(true));
			iCookie.reset();
			const result = await iAuth.Authenticate(user);
			if (result.data.code === httpCodes.Ok) {
				dispatch(setAuthenticateSuccess(true));
				dispatch(setUID(user.username));
				const expire = "expires=" + iCookie.time();
				const cookie = "session=" + result.data.session_id + ";" + expire + ";path=/";
				const cookie2 = "uid=" + user.username + ";" + expire + ";path=/";
				iCookie.set(cookie);
				iCookie.set(cookie2);
				dispatch(Refer());
			}
			else {
				dispatch(Error("AUTH_FAIL"));
			}
		}
		catch(error) {
			dispatch(Error("AUTH_ERROR"));
		}
		dispatch(Authenticate(false));
	};
}

export function handlerDeAuth() {
	return async (dispatch)=>{
		try {
			const user = await iAuth.getUserFromCookie();
			dispatch(Error());
			iCookie.reset();
			const result = await iAuth.Deauthenticate(user);
			if (result.data.code === httpCodes.Ok) {
				dispatch(Reset());
				iCookie.reset();
				window.location.reload();
			}
			else {
				dispatch(Error("DEAUTH_FAIL"));
			}
		}
		catch(error) {
			dispatch(Error("DEAUTH_ERROR"));
		}
	};
}

export function handlerRegister(user=undefined) {
	return async (dispatch)=>{
		try {
			const result = await iAuth.Register(user);
			if (result.data.code === httpCodes.SignUpSuccess) {
				dispatch(Error());
				dispatch(setSignUpSuccessful(true));
				dispatch(ifSignUp(false));
			}
			else {
				dispatch(Error("REG_FAIL"));
			}
		}
		catch(error) {
			dispatch(Error("REG_ERROR"));
		}
	}
}