import React from "react";
import Styles from "./style.css";
import { Line } from "rc-progress";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { incorrectAnswer, correctAnswer, nextQuestion, getNextBlock } from "../../../redux/actions/questions";
import modalStyle from "../style.css";


const Choice = props => (
    <div>
        <input className={Styles.choice} onClick={props.check} type="radio" name="choice" id={"choice" + props.index} value={props.value}/>
        <label className={Styles.choicelabel} htmlFor={"choice" + props.index}>{props.letter + ") " + props.value}</label>
    </div>
);

class Question extends React.Component {
    constructor(props) {
        super(props);
        this.checkAnswer = this.checkAnswer.bind(this);
        this.next = this.next.bind(this);
    }
    componentDidMount() {
        if(this.props.answer === "correct") {
            const choices = document.getElementsByClassName(Styles.choice);
            for(let i = 0; i < choices.length; ++i) {
                choices[i].disabled = true;
            }
        }
    }
    checkAnswer(event) {
        if (!this.props.answer || this.props.answer === "incorrect") {
            const selected = document.getElementById(event.target.id);
            if (event.target.value === this.props.questions[this.props.index].CorrectAnswer) {
                const choices = document.getElementsByClassName(Styles.choice);
                for(let i = 0; i < choices.length; ++i) {
                    choices[i].disabled = true;
                }
                this.props.correctAnswer();
            }
            else {
                this.props.incorrectAnswer();
            }
        }
    }
    showModal() {
        const modal = document.getElementsByClassName(modalStyle.modal)[0];
        modal.style.transform = "translateY(0px)";
    }
    next() {
        const choices = document.getElementsByClassName(Styles.choice);
        for(let i = 0; i < choices.length; ++i) {
            choices[i].checked = false;
            choices[i].disabled = false;
        }
        if (this.props.index < 9) {
            this.props.nextQuestion();
        } 
        else {
            this.showModal();
            this.props.getNextBlock(this.props.questions[0].QuestionBlockID, this.props.user);
        }
    }
    render() {
        const percent = (parseFloat(((this.props.index) / this.props.questions.length)) * 100).toString();
        if (this.props.questions.length <= 0) {
            return (
                <div className={Styles.alldone}>No Questions!</div>
            );
        }
        return (
            <div className={Styles.question}>
                <div className={Styles.header}>
                    <h1>All Questions</h1>
                    <div className={Styles.progresscontainer}>
                        <span>Current Progress:</span>
                        <div className={Styles.progress}>
                            <Line className={Styles.progressbar} percent={percent} strokeWidth="4" strokeColor="#88FF95" trailWidth="4"/>
                        </div>
                    </div>
                </div>
                <div className={Styles.questioncontents}>
                    <div className={Styles.subjects}>
                        <h2>Subjects</h2>
                        <span className={Styles.subject}><i className={["fa", "fa-times", Styles.remove].join(" ")} aria-hidden="true"/>Math</span>
                        <span className={Styles.subject}><i className={["fa", "fa-times", Styles.remove].join(" ")} aria-hidden="true"/>Add...</span>
                    </div>
                    <div className={Styles.selection}>
                        <div className={Styles.topic}>
                            <h1>{"Question " + (this.props.index + 1) + ":"}</h1>
                            <p>{this.props.questions[this.props.index].QuestionText}</p>
                        </div>
                        <div className={Styles.choices}>
                            {this.props.answer === "correct" && <span>Correct!</span> }
                            {this.props.answer === "incorrect" && <span>Incorrect!</span> }
                            <div>Answers: </div>
                            <div className={Styles.multiplechoice}>
                                <Choice index="1" letter="A" value={this.props.questions[this.props.index].QuestionOne} check={this.checkAnswer}/>
                                <Choice index="2" letter="B" value={this.props.questions[this.props.index].QuestionTwo} check={this.checkAnswer}/>
                                <Choice index="3" letter="C" value={this.props.questions[this.props.index].QuestionThree} check={this.checkAnswer}/>
                                <Choice index="4" letter="D" value={this.props.questions[this.props.index].QuestionFour} check={this.checkAnswer}/>
                            </div>
                        </div>
                        {this.props.answer === "correct" && <div onClick={this.next} className={Styles.nextbtn}>Next</div> }
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(
	(state) => ({user: state.user, states: state.state, questions: state.questions.questions, index: state.questions.index, answer: state.questions.selectedAnswer}),
	(dispatch) => bindActionCreators({incorrectAnswer,correctAnswer,nextQuestion, getNextBlock }, dispatch)
)(Question);
