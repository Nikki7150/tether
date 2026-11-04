import { useState } from "react";


const AddTask = () => {
    const [newTask, setNewTask] = useState('');

    const handleAddTask = () => {

    };

    return (
        <div className="add-task-container">
            <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="New Task..."
                required
            />
            <button className="add-button" onClick={() => handleAddTask()}>+</button>
        </div>
    )
}

export default AddTask;