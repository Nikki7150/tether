import { useState } from "react";
import { useTaskStore } from '../store/useTaskStore';
import '../styles/App.css';

const AddTask = () => {
    const [newTask, setNewTask] = useState('');
    const { addTask } = useTaskStore();

    const handleAddTask = () => {
        const text = newTask.trim();
        if (text !== '') addTask(text);
        setNewTask('');
    }

    return (
        <div className="add-task-container">
            <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="New Task..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
                className="task-input"
            />
            <button className="add-button" onClick={handleAddTask}>+</button>
        </div>
    )
}

export default AddTask;