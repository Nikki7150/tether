import React, { useState } from "react";

const Settings = ({ notionConnected, setNotionConnected, onBack }) => {
    const [token, setToken] = useState('');
    const databaseId, setDatabaseId = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const success = await window.electron.ipcRenderer.invoke('notion:connect', { token, databaseId });
            setNotionConnected(Boolean(success));
            if (success) {
                setToken('');
                setDatabaseId('');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        try {
            await window.electron.ipcRenderer.invoke('notion:disconnect');
            setNotionConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 
    );
}
export default Settings;