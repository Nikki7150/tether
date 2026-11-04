import { useState } from 'react';
import './styles/App.css'
function App() {
  const [expanded, setExpanded] = useState(false);
  const handleMouseDown = () => {
    let hasMoved = false;
    window.electron.ipcRenderer.send('drag-start');
    const onMove = () => {
      window.electron.ipcRenderer.send('drag-move');
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.electron.ipcRenderer.send('drag-end');
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    window.electron.ipcRenderer.send('set-expanded', next)
  }
  return (
    <div className={expanded ? 'app expanded' : 'app'} onMouseDown={handleMouseDown}>
      {expanded && <p>todo list goes here</p>}
      <button className='num-tasks' onClick={toggle}>8</button>
    </div>
  )
}

export default App
