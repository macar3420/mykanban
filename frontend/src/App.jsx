import "./App.css";

function App() {
  return (
    <div className="page">
      <div className="board">
        <div className="column">
          <h3>To Do</h3>
        </div>

        <div className="column">
          <h3>In Progress</h3>
          <ul className="items"></ul>
        </div>

        <div className="column">
          <h3>Done</h3>
          <ul className="items"></ul>
        </div>
      </div>
    </div>
  );
}

export default App;
