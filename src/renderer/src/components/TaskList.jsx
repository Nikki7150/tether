import { useState } from "react";
import { useTaskStore } from '../store/useTaskStore';
import TaskItem from "./TaskItem";
import '../styles/TaskList.css';

const TaskList = () => {
    const { tasks, toggleTask, removeTask } = useTaskStore();

    return (
        <div className="task-list-container">
            {tasks.map((task) => (
                <TaskItem 
                    key={task.id}
                    id={task.id}
                    text={task.text}
                    completed={task.completed}
                    onToggle={toggleTask}
                    onRemove={removeTask}
                />
            ))}
        </div>
    )
}

export default TaskList;