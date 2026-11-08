import { create } from "zustand";

export const useTaskStore = create((set) => ({
    tasks: [],
    addTask: (text) => {
        const newTask = {
            id: crypto.randomUUID(),
            text: text,
            completed: false,
            completedAt: Date.now(),
        }
        set((state) => ({
            tasks: [...state.tasks, newTask]
        }))
    },

    toggleTask: (id) => {
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, completed: !task.completed, completedAt: !task.completed ? Date.now() : null } : task
            )
        }))
    },

    removeTask: (id) => {
        set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id)
        }))
    },

    loaded: false,

    loadTasks: async () => {
        try {
            const saved = await window.electron.ipcRenderer.invoke('tasks:load');
            set({ tasks: saved || [], loaded: true });
        } catch (error) {
            console.error('Failed to load tasks: ', error);
            set({ loaded: true });
        }
    },
}))