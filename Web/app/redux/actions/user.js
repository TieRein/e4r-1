import "babel-polyfill";
import * as Types from "../types";
import efrApi from "../../libraries/efrApi";
import { setQuestions } from "./questions";
import iCookie from "../../libraries/iCookie";

export function getQuestions(userObject) {
    return async (dispatch)=>{
        try {
            const result = await efrApi.getQuestions({session: iCookie.get("session"), userobject: userObject});
            dispatch(setQuestions(result.data.question_block));
        }
        catch(err) {
            console.log("err",err);
        }
    };
}

export function setUserObject(object) {
    return {
        type: Types.SET_USER_OBJECT,
        value: object
    }
}

export function setComplete(qid) {
    return {
        type: Types.SET_COMPLETED,
        value: [qid]
    }
}

export function handleNames(fname, lname, object) {
    return async dispatch => {
        const user = {
            session: iCookie.get("session"),
            userobject: Object.assign({}, object, {
                user_data: {
                    ...object.user_data,
                    first_name: fname,
                    last_name: lname
                }
            })
        };
        const result = await efrApi.updateUser(user);
        if (result.data.response === "Success") {
            dispatch(setUserObject(result.data.userobject));
        }
    }
}

export function setFname(fname) {
    return {
        type: Types.SET_F_NAME,
        value: fname
    }
}

export function setLname(lname) {
    return {
        type: Types.SET_L_NAME,
        value: lname
    }
}

