// Channel Manager class

class ChannelManager {
  constructor() {
    this.channels = new Map();
  }

  getChannels() {
    return this.channels;
  }

  addChannel(channel) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, {
        created_on: new Date(),
        created_by: null,
        participants: new Set(),
        questions: new Map(),
      });
    }
  }

  addCreator(channel, name) {
    const channelObj = this.channels.get(channel);
    channelObj.created_by = name;
    console.log("Channel created by", name);
    this.channels.set(channel, channelObj);
  }

  addParticipant(channel, name, isCreator) {
    this.addChannel(channel, name);
    // Add user to channel
    if (isCreator) {
      this.addCreator(channel, name);
    }

    const participants = this.getParticipants(channel);
    if (!participants) {
      console.log("Channel does not exist", channel);
      return;
    }
    participants.add(name);
    // this.channels.set(channel, {participants: participants, questions: channelObj.questions});
    this.setParticipants(channel, participants);

    return participants;
  }

  isChannelExists(channel) {
    return this.channels.has(channel);
  }

  getParticipants(channel) {
    if (this.isChannelExists(channel)) {
      const channelObj = this.channels.get(channel);
      return channelObj.participants;
    } else {
      console.log("Channel does not exist", channel);
      return;
    }
  }

  setParticipants(channel, participants) {
    if (this.isChannelExists(channel)) {
      const channelObj = this.channels.get(channel);
      this.channels.set(channel, {
        ...channelObj,
        participants: participants,
      });
    } else {
      console.log("Channel does not exist", channel);
    }
  }

  addQuestion(channel, question) {
    const questions = this.getQuestions(channel);
    if (!questions) {
      console.log("Channel does not exist", channel);
      return false;
    }
    questions.set(question, {});
    this.setQuestions(channel, questions);
    return questions;
  }

  getQuestions(channel) {
    if (this.isChannelExists(channel)) {
      const channelObj = this.channels.get(channel);
      return channelObj.questions;
    } else {
      console.log("Channel does not exist", channel);
      return;
    }
  }

  setQuestions(channel, questions) {
    if (this.isChannelExists(channel)) {
      const channelObj = this.channels.get(channel);
      this.channels.set(channel, {
        ...channelObj,
        questions: questions,
      });
    } else {
      console.log("Channel does not exist", channel);
    }
  }

  getLastQuestion(channel) {
    const questions = this.getQuestions(channel);
    if (!questions) {
      console.log("Question not found", channel);
      return;
    }
    const lastQuestion = Array.from(questions.keys()).pop();
    return lastQuestion;
  }

  addVotesToQuestion(channel, question, user, vote) {
    const questions = this.getQuestions(channel);
    if (!questions) {
      console.log(
        "Couldnt add votes as the question specified not found in the channel",
        channel,
        question
      );
      return;
    }
    const questionObj = questions.get(question);
    if (!questionObj.votes) {
      questionObj.votes = [];
    } else {
      //check if user has already voted
      const userVote = questionObj.votes.find(
        (voteObj) => voteObj.user === user
      );
      if (userVote) {
        userVote.vote = vote;
        this.setQuestions(channel, questions);
        return questionObj.votes;
      }
    }
    questionObj.votes.push({ user, vote });
    questions.set(question, questionObj);
    this.setQuestions(channel, questions);
    return questionObj.votes;
  }
}

export default ChannelManager;
