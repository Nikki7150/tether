import React, { useState } from "react";
import '../styles/App.css'

const Settings = ({ notionConnected, setNotionConnected, onBack }) => {
    const [token, setToken] = useState('');
    const [dataSourceId, setdataSourceId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConnect = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const result = await window.electron.ipcRenderer.invoke('notion:connect', { token, dataSourceId });
            if (result.ok) {
                setNotionConnected(true);
                setToken('');
                setdataSourceId('');
            } else {
                setError(result.error);
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
        <div className="settings-view" onMouseDown={(e) => e.stopPropagation()}>
            <div className="settings-header">
                <button type="button" onClick={onBack} className="back-button">Back</button>
                <h2 className="settings-h2">Settings</h2>
                <span className="space"></span>
            </div>
            {notionConnected ? (
                <div className="connected-state">
                    <p className="connected-text">Connected to Notion. </p>
                    <button type="button" onClick={handleDisconnect} disabled={isLoading} className="disconnect-button">
                        {isLoading ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleConnect} className="connect-form">
                    <h3 className="notion-head">Notion Sync</h3>
                    <div className="form-group">
                        <label htmlFor="notion-token">Integration Token</label>
                        <input
                            id="notion-token"
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="secret_..."
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="notion-database-id">Database ID</label>
                        <input
                            id="notion-database-id"
                            type="text"
                            value={dataSourceId}
                            onChange={(e) => setdataSourceId(e.target.value)}
                            placeholder="Enter Database ID"
                            required
                        />
                    </div>
                    {error && <p className="settings-error">{error}</p>}
                    <button type="submit" disabled={isLoading} className="connect-button">
                        {isLoading ? 'Connecting...' : 'Connect'}
                    </button>
                </form>
            )}
        </div>
    );
}
export default Settings;