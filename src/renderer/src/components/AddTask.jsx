import { useEffect, useRef, useState } from "react";
import { useTaskStore } from '../store/useTaskStore';
import '../styles/App.css';

const AddTask = ({ focusRequestId = 0 }) => {
    const [newTask, setNewTask] = useState('');
    const inputRef = useRef(null);
    const { addTask } = useTaskStore();

    useEffect(() => {
        if (focusRequestId === 0) return;

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }, [focusRequestId]);

    const handleAddTask = () => {
        const text = newTask.trim();
        if (text !== '') addTask(text);
        setNewTask('');
    }

    return (
        <div className="add-task-container">
            <input
                ref={inputRef}
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