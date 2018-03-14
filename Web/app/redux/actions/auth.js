import "babel-polyfill";

import { 
	SET_USER_INFO,
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
import { setUserObject } from "./user";
import httpCodes from "../httpCodes";
import efrApi from "../../libraries/efrApi";
import iCookie from "../../libraries/iCookie";

export function setUID(name) {
	return {
		type: SET_UID,
		value: name
	}
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
			dispatch(Error());
			const result = await efrApi.renewSession();
			if (result.data.code === httpCodes.Ok) {
				iCookie.reset();
				const expire = "expires=" + iCookie.time();
				const cookie = "session=" + result.data.session_id + ";" + expire + ";path=/";
				iCookie.set(cookie);
				const updateObject = await efrApi.updateUser({
					session: iCookie.get("session"),
					userobject: iCookie.getStorage("userobject")
				});
				dispatch(setAuthenticateSuccess(true));
				dispatch(setUserObject(updateObject.data.userobject));
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
			const result = await efrApi.login(user);
			if (result.data.code === httpCodes.Ok) {
				iCookie.setStorage("userobject", result.data.user_object);
				dispatch(setAuthenticateSuccess(true));
				dispatch(setUserObject(result.data.user_object));
				dispatch(setUID(user.username));
				const expire = "expires=" + iCookie.time();
				const cookie = "session=" + result.data.session_id + ";" + expire + ";path=/";
				const cookie2 = "uid=" + user.username + ";" + expire + ";path=/";
				iCookie.set(cookie);
				iCookie.set(cookie2);
				iCookie.add("solved", result.data.user_object.game_data.totalQuestions);
				dispatch(Refer());
			}
			else {
				dispatch(Error("AUTH_FAIL"));
			}
		}
		catch(error) {
			dispatch(Error(error.message.indexOf("timeout") >= 0 ? "AUTH_TIMEOUT" : "AUTH_ERROR"));
		}
		dispatch(Authenticate(false));
	};
}

export function handlerDeAuth(userobject) {
	return async (dispatch)=>{
		try {
			const result = await efrApi.logout(userobject);
			dispatch(Error());
			iCookie.reset();
			iCookie.removeStorage("userobject");
			if (result.data.code !== httpCodes.Ok) {
				dispatch(Error("DEAUTH_FAIL"));
			}
			dispatch(Reset());
			window.location.reload();
		}
		catch(error) {
			dispatch(Error("DEAUTH_ERROR"));
		}
	};
}

export function handlerRegister(user=undefined) {
	return async (dispatch)=>{
		try {
			const result = await efrApi.signup(user);
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