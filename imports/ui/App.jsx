import React, { Component, PropTypes } from 'react';
import { Meteor } from 'meteor/meteor';
import { gql, graphql } from 'react-apollo';
import update from 'immutability-helper';

import Task from './Task';
import AccountsUIWrapper from './AccountsUIWrapper';

@graphql(gql`
  query AppQuery {
    tasks {
      _id
      text
      email
      owner
      checked
      private
      createdAt
    }
    currentUser {
      _id
      emails {
        address
      }
    }
  }
`)
@graphql(gql`
  mutation addTask($text: String!) {
    addTask(text: $text) {
      _id
      text
      email
      owner
      checked
      private
      createdAt
    }
  }
`, {
  props: ({ ownProps, mutate }) => ({
    addTask: (text) => {
      return mutate({
        variables: { text },
        updateQueries: {
          AppQuery: (prev, { mutationResult }) => {
            const task = mutationResult.data.addTask;
            return update(prev, {
              tasks: {
                $unshift: [task],
              },
            });
          },
        },
      });
    },
  }),
})
class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      text: '',
      hideCompleted: false,
    };
  }

  handleChange(event) {
    this.setState({
      text: event.target.value,
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { text } = this.state;
    const { addTask } = this.props;
    const { currentUser } = this.props.data;
    addTask(text);
    this.setState({ text: '' });
  }

  toggleHideCompleted() {
    this.setState({
      hideCompleted: !this.state.hideCompleted,
    });
  }

  renderTasks() {
    const tasks = this.props.data.tasks;
    if (!tasks) {
      return;
    }

    const currentUserId = this.props.data.currentUser && this.props.data.currentUser._id;
    const filteredTasks = tasks.filter(task => (
      !this.state.hideCompleted || !task.checked
    ));
    return filteredTasks.map(task => {
      const showPrivateButton = currentUserId === task.owner;

      return (
        <Task
          key={task._id}
          task={task}
          showPrivateButton={showPrivateButton}
        />
      );
    });
  }

  render() {
    const { data: { loading, tasks, currentUser } } = this.props;

    if (loading) {
      return null;
    }

    const incompleteCount = tasks.filter(task => !task.checked).length;

    return (
      <div className="container">
        <header>
          <h1>Todo List ({incompleteCount})</h1>

          <label className="hide-completed">
            <input
              type="checkbox"
              readOnly
              checked={this.state.hideCompleted}
              onClick={this.toggleHideCompleted.bind(this)}
            />
            Hide completed tasks
          </label>

          <AccountsUIWrapper />

          { currentUser ?
            <form className="new-task" onSubmit={this.handleSubmit.bind(this)}>
              <input
                type="text"
                placeholder="Type to add new tasks"
                value={this.state.text}
                onChange={this.handleChange.bind(this)}
                />
            </form> : ''
          }
        </header>

        <ul>
          {this.renderTasks()}
        </ul>
      </div>
    );
  }
}

App.propTypes = {
  data: PropTypes.shape({
    loading: PropTypes.bool,
    tasks: PropTypes.array,
    currentUser: PropTypes.object,
  }).isRequired,
};

App.defaultProps = {
  data: {
    loading: true,
    tasks: [],
    currentUser: null,
  }
};

export default App;
