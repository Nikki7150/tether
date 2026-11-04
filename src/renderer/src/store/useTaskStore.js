import { create } from "zustand";

export const useTaskStore = create((set) => ({
    task: [],
    addTask: (text) => {
        const newTask = {
            id: crypto.randomUUID(),
            text: text,
            completed: false,
        }
        set((state) => ({
            tasks: [...state.tasks, newTask]
        }))
    },

    toggleTask: (id) => {
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        }))
    },

    removeTask: (id) => {
        set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id)
        }))
    }
}))