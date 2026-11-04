import '../styles/TaskList.css';
import { CiTrash } from "react-icons/ci";

const TaskItem = ({ id, text, completed, onToggle, onRemove }) => {
    return (
        <div className="task-item-container">
            <input className="checkmark" type="checkbox" checked={completed} onChange={() => onToggle(id)} />
            <p className={completed ? 'task-text completed' : 'task-text'}>{text}</p>
            <button className="delete-button" onClick={() => onRemove(id)}><CiTrash size={20} /></button>
        </div>
    )
}

export default TaskItem;