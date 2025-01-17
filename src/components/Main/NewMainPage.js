import React, { useEffect, useRef, useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Grid,
    Paper,
    Avatar,
    TextField,
    IconButton,
    Tab,
    Tabs,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import VideocamIcon from '@mui/icons-material/Videocam';
import LinkIcon from '@mui/icons-material/Link';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import useWebRTC from '../../hooks/useWebRTC';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import OnlineUsers from './NewOnlineUsers';
import { v4 as uuidv4 } from 'uuid';
import FileList from './FileList';
import VideoCall from './VideoCall';

const MainPage = () => {
    const [token] = useState(sessionStorage.getItem("token"));
    const [username] = useState(sessionStorage.getItem("username"));
    const [socket, setSocket] = useState(null);
    const [file, setFile] = useState(null);
    const [textMessage, setTextMessage] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserData, setSelectedUserData] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [usersData, setUsersData] = useState({});
    const navigate = useNavigate();

    const socketRef = useRef(null);
    const [peerId, setPeerId] = useState("");
    const [connectionRequest, setConnectionRequest] = useState(null);
    const [videoCallRequest, setVideoCallRequest] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState({});
    const [remoteStream, setRemoteStream] = useState(null);
    const [isAddTrack, setIsAddTrack] = useState(false);
    const [isVideoCall, setIsVideoCall] = useState(false);
    const [isRequestingCallVideo, setIsRequestingCallVideo] = useState(false);

    const OnReceivedMessage = (type, data, peerId) => {
        const uniqueId = uuidv4();
        const newMessage = {
            id: uniqueId,
            type: type,
            status: "sent",
            data: data,
        };
        setUsersData(prev => ({ ...prev, [peerId]: [...(prev[peerId] || []), newMessage] }));

    };

    const { createPeerConnection, sendOffer, sendFile, receivedFiles, progress, sendTextMessage, peerRef, addLocalTracks, setRenegotiate } = useWebRTC(socketRef, OnReceivedMessage, setRemoteStream);

    useEffect(() => {
        const newSocket = io(process.env.REACT_APP_BACKEND);
        socketRef.current = newSocket;
        setSocket(newSocket);

        const handleConnectionSuccessful = ({ remote }) => {
            setConnectionStatus((prev) => ({
                ...prev,
                [remote]: "connected",
            }));
        };

        const handlePeerDisconnected = ({ remote }) => {
            setConnectionStatus((prev) => ({
                ...prev,
                [remote]: "disconnected",
            }));
        };

        const handleConnectionRejected = ({ from }) => {
            setConnectionStatus((prev) => ({
                ...prev,
                [from]: "",
            }));
        };

        newSocket.on("connect", () => {
            setPeerId(newSocket.id);
        });

        newSocket.on("request-connection", ({ from, username }) => {
            setConnectionRequest({ id: from, username: username });
        });

        newSocket.on("request-video-call", ({ from, username }) => {
            setVideoCallRequest({ id: from, username: username });
        });

        newSocket.on("connection-accepted", ({ from }) => {
            handleConnectionAccepted(from);
        });

        newSocket.on("video-call-accepted", ({ from }) => {
            handleVideoCallAccepted(from);
        });


        newSocket.on("connection-succesful", handleConnectionSuccessful);
        newSocket.on("peer-disconnected", handlePeerDisconnected);
        newSocket.on("connection-rejected", handleConnectionRejected);
        newSocket.on("video-call-rejected", handleVideoCallRejected);

        return () => {
            console.log("Disconnecting socket...");
            newSocket.disconnect();
        };
    }, []);


    const handleAcceptConnection = () => {
        if (!connectionRequest) return;

        socket.emit("connection-accepted", { to: connectionRequest.id });
        setSelectedUser(connectionRequest.id);
        setSelectedUserData((prev) => ({
            ...prev,
            username: connectionRequest.username,
            id: connectionRequest.id,
        }));

        setConnectionRequest(null);
    };

    const handleAcceptVideoCall = () => {
        if (!videoCallRequest) return;

        socket.emit("video-call-accepted", { to: videoCallRequest.id });
        setSelectedUser(videoCallRequest.id);
        setSelectedUserData((prev) => ({
            ...prev,
            username: videoCallRequest.username,
            id: videoCallRequest.id,
        }));

        setVideoCallRequest(null);
        setRenegotiate(false);
        setIsAddTrack(false);
        setIsRequestingCallVideo(false);
        setIsVideoCall(true);
    };

    const handleRejectConnection = () => {
        if (!connectionRequest) return;

        socket.emit("connection-rejected", { to: connectionRequest.id });

        setConnectionRequest(null);
    };

    const handleRejectVideoCall = () => {
        if (!videoCallRequest) return;

        socket.emit("video-call-rejected", { to: videoCallRequest.id });

        setVideoCallRequest(null);
    };

    const connectToPeer = (peerId) => {
        socket.emit("request-connection", { peerId, requestUsername: username });
    };

    const handleConnectionAccepted = (peerId) => {
        createPeerConnection();
        sendOffer(peerId);
    }


    const handleLogout = () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        navigate("/login");
    };

    const handleUserClick = (id, username) => {
        setSelectedUser(id);
        setSelectedUserData((prev) => ({
            ...prev,
            username: username,
            id: id,
        }));
    };

    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    const renderContent = () => {
        switch (selectedTab) {
            case 0:
                return (
                    <OnlineUsers
                        handleUserClick={handleUserClick}
                        selectedUser={selectedUser}
                        token={token}
                        connectToPeer={connectToPeer}
                        socket={socket}
                        connectionStatus={connectionStatus}
                    />
                );
            case 1:
                return <Typography variant="body1">Offline Content</Typography>;
            case 2:
                return (
                    <FileList files={receivedFiles} />
                );
            default:
                return null;
        }
    };

    const handleConnectClick = (id) => {
        connectToPeer(id);
        setConnectionStatus((prev) => ({
            ...prev,
            [id]: "requesting",
        }));
    };

    const handleDisconnectClick = (id) => {
        peerRef.current.close();
        socket.emit("peer-disconnected", { remote: peerRef.current.remotePeerId })
    };

    const handleSendFile = () => {
        if (!file) return;
        const uniqueId = uuidv4();
        const newMessage = {
            id: uniqueId,
            type: "file",
            status: "sending",
            data: {
                name: file.name,
                sender: username,
                senderId: peerId,
            },
        };
        setUsersData(prev => ({ ...prev, [selectedUser]: [...(prev[selectedUser] || []), newMessage] }));
        const toPeerId = selectedUser;
        sendFile(file, (downloadURL) => { OnSendFileComplete(uniqueId, toPeerId, downloadURL); });

    };

    const OnSendFileComplete = (fileId, selectedUser, downloadURL) => {
        setUsersData(prev => ({
            ...prev,
            [selectedUser]: prev[selectedUser].map(message =>
                message.id === fileId
                    ? { ...message, status: "sent", data: { ...message.data, url: downloadURL } }
                    : message
            )
        }));
    };

    const handleSendTextMessage = () => {
        if (!textMessage.trim()) return;
        const uniqueId = uuidv4();
        const newMessage = {
            id: uniqueId,
            type: "text",
            status: "sending",
            data: {
                content: textMessage.trim(),
                sender: username,
                senderId: peerId,
            },
        };
        setUsersData(prev => ({ ...prev, [selectedUser]: [...(prev[selectedUser] || []), newMessage] }));
        const toPeerId = selectedUser;
        sendTextMessage(newMessage.data, () => { OnSendTextMessageComplete(uniqueId, toPeerId); });
        setTextMessage("");
    };

    const OnSendTextMessageComplete = (messageId, selectedUser) => {
        setUsersData(prev => ({
            ...prev,
            [selectedUser]: prev[selectedUser].map(message =>
                message.id === messageId
                    ? { ...message, status: "sent" }
                    : message
            )
        }));
    };

    const handleVideoCallClick = () => {
        setIsRequestingCallVideo(true);
        socket.emit("request-video-call", { peerId: selectedUser, requestUsername: username });
    };

    const handleVideoCallAccepted = (from) => {
        setRenegotiate(true);
        setIsAddTrack(false);
        setIsRequestingCallVideo(false);
        setIsVideoCall(true);
    };

    const handleVideoCallRejected = () => {

    };

    const handleEndVideoCall = () => {
        setIsVideoCall(false);
    };

    return (
        <Box sx={{ backgroundColor: '#f0f8ff' }}>
            {/* AppBar */}
            <AppBar position="fixed" color="primary">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        File Sharing
                    </Typography>
                    <Button color="inherit" onClick={handleLogout}>Logout</Button>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Grid container spacing={2} sx={{ height: 'calc(100vh - 64px)', padding: 2, marginTop: '64px' }}>
                {/* Left Sidebar */}
                <Grid item xs={4}>
                    <Paper elevation={3} sx={{ height: '100%', maxHeight: 'calc(100vh - 64px)', padding: 2, borderRadius: 4, overflowY: 'auto' }}>
                        <Typography variant="h6">Welcome, {username}</Typography>
                        {socket && peerId && (
                            <Typography variant="body2" color="text.secondary">
                                Your Peer ID: <strong>{peerId}</strong>
                            </Typography>
                        )}


                        {/* Tabs */}
                        <Tabs value={selectedTab} indicatorColor="primary" textColor="primary" sx={{ marginTop: 2 }} onChange={handleTabChange}>
                            <Tab label="Online" />
                            <Tab label="Offline" />
                            <Tab label="Received Files" />
                        </Tabs>

                        {/* Tab Content */}
                        {renderContent()}
                    </Paper>
                </Grid>



                {/* Chat Section */}
                <Grid item xs={8}>
                    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4 }}>
                        {isVideoCall ? (
                            <VideoCall
                                isAddTrack={isAddTrack}
                                remoteUsername={selectedUserData?.username || 'Unknown User'}
                                onEndCall={handleEndVideoCall}
                                remoteStream={remoteStream}
                                addLocalTracks={addLocalTracks}
                            />
                        ) : (
                            <>
                                {/* Chat Header */}
                                <Box
                                    sx={{
                                        padding: 2,
                                        borderBottom: '1px solid #ddd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Avatar sx={{ marginRight: 2 }}></Avatar>
                                        <Box>
                                            <Typography variant="h6">{selectedUserData?.username}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Peer Id: {selectedUser}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {connectionStatus[selectedUser] === "requesting" && (
                                            <Alert severity="info" sx={{ marginRight: 2, padding: "2px 8px" }}>
                                                Sending Request...
                                            </Alert>
                                        )}
                                        {isRequestingCallVideo && (
                                            <Alert severity="info" sx={{ marginRight: 2, padding: "2px 8px" }}>
                                                Calling...
                                            </Alert>
                                        )}
                                        {connectionStatus[selectedUser] === "connected" && (
                                            <Alert severity="success" sx={{ marginRight: 2, padding: "2px 8px" }}>
                                                Connected
                                            </Alert>
                                        )}

                                        {connectionStatus[selectedUser] !== "connected" && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                startIcon={<LinkIcon />}
                                                onClick={() => handleConnectClick(selectedUser)}
                                                disabled={connectionStatus[selectedUser] === "requesting" || !selectedUser}
                                                sx={{ marginRight: 2 }}
                                            >
                                                Connect
                                            </Button>
                                        )}
                                        {connectionStatus[selectedUser] === "connected" && (
                                            <Button
                                                variant="contained"
                                                color="error"
                                                onClick={() => handleDisconnectClick(selectedUser)}
                                                sx={{ marginRight: 2 }}
                                            >
                                                Disconnect
                                            </Button>
                                        )}

                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            disabled={connectionStatus[selectedUser] !== "connected" || isRequestingCallVideo}
                                            startIcon={<VideocamIcon />}
                                            onClick={handleVideoCallClick}
                                        >
                                            CALL VIDEO
                                        </Button>
                                    </Box>
                                </Box>




                                {/* Chat Messages */}
                                <Box sx={{ flexGrow: 1, padding: 2, overflowY: 'auto', maxHeight: "365px" }}>
                                    {usersData[selectedUser]?.map((message, index) => (
                                        <Box key={index}>
                                            {message.type === "file" && message.status === "sending" && message.data.senderId === peerId && (
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-end',
                                                            padding: 1,
                                                            borderRadius: 2,
                                                            backgroundColor: '#673ab7',
                                                            color: '#fff',
                                                            maxWidth: '70%',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                                                            <InsertDriveFileIcon sx={{ marginRight: 1 }} />
                                                            <strong>{message?.data?.name}</strong>
                                                        </Box>
                                                        <LinearProgress variant="determinate" value={progress} sx={{ width: '100%' }} />
                                                    </Box>
                                                </Box>
                                            )}
                                            {message.type === "file" && message.status === "sent" && message.data.senderId === peerId && (
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
                                                    <Box
                                                        sx={{
                                                            padding: 1,
                                                            borderRadius: 2,
                                                            backgroundColor: '#673ab7',
                                                            color: '#fff',
                                                            maxWidth: '70%',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <InsertDriveFileIcon sx={{ marginRight: 1 }} />
                                                            <a
                                                                href={message?.data?.url}
                                                                download={message?.data?.name}
                                                                style={{ color: 'inherit', fontWeight: 'bold' }}
                                                            >
                                                                {message?.data?.name}
                                                            </a>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                            {message.type === "file" && message.status === "sent" && message.data.senderId !== peerId && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                                                    <Avatar sx={{ width: 28, height: 28, marginRight: 1 }}></Avatar>
                                                    <Box
                                                        sx={{
                                                            padding: 1,
                                                            borderRadius: 2,
                                                            backgroundColor: '#f1f1f1',
                                                            maxWidth: '70%',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <InsertDriveFileIcon sx={{ marginRight: 1 }} />
                                                            <a
                                                                href={message?.data?.url}
                                                                download={message?.data?.name}
                                                                style={{ color: 'inherit', fontWeight: 'bold' }}
                                                            >
                                                                {message?.data?.name}
                                                            </a>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                            {message.type === "text" && message.status === "sending" && message.data.senderId === peerId && (
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
                                                    <Box
                                                        sx={{
                                                            padding: 1,
                                                            borderRadius: 2,
                                                            backgroundColor: '#673ab7',
                                                            color: '#fff',
                                                            maxWidth: '70%',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <CircularProgress size={20} sx={{ marginRight: 1, color: "inherit" }} />
                                                            {message.data.content}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}

                                            {message.type === "text" && message.status === "sent" && message.data.senderId === peerId && (
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
                                                    <Box
                                                        sx={{
                                                            padding: 1,
                                                            borderRadius: 2,
                                                            backgroundColor: '#673ab7',
                                                            color: '#fff',
                                                            maxWidth: '70%',
                                                        }}
                                                    >
                                                        {message.data.content}
                                                    </Box>
                                                </Box>
                                            )}

                                            {message.type === "text" && message.status === "sent" && message.data.senderId !== peerId && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                                                    <Avatar sx={{ width: 28, height: 28, marginRight: 1 }}></Avatar>
                                                    <Box
                                                        sx={{
                                                            padding: 1,
                                                            borderRadius: 2,
                                                            backgroundColor: '#f1f1f1',
                                                            maxWidth: '70%',
                                                        }}
                                                    >
                                                        {message.data.content}
                                                    </Box>
                                                </Box>
                                            )}

                                        </Box>
                                    ))}



                                </Box>

                                {/* Chat Input */}
                                <Box
                                    sx={{
                                        padding: 2,
                                        borderTop: '1px solid #ddd',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <TextField
                                        type="file"
                                        variant="outlined"
                                        size="small"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        sx={{
                                            marginRight: 1,
                                            flex: 1, // Chiếm 1 nửa không gian
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleSendFile}
                                        disabled={connectionStatus[selectedUser] !== "connected" || (progress > 0 && progress < 100)}
                                        sx={{
                                            marginRight: 1,
                                            whiteSpace: 'nowrap', // Đảm bảo nội dung không xuống dòng
                                            minWidth: 'auto',     // Điều chỉnh kích thước tối thiểu của nút
                                            padding: '6px 12px',  // Điều chỉnh padding nếu cần
                                        }}
                                    >
                                        Send File
                                    </Button>
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                        placeholder="Gửi tin nhắn"
                                        value={textMessage}
                                        onChange={(e) => setTextMessage(e.target.value)}
                                        sx={{
                                            marginRight: 1,
                                            flex: 1, // Chiếm 1 nửa không gian
                                        }}
                                        slotProps={{
                                            input: {
                                                sx: {
                                                    borderRadius: 8, // điều chỉnh mức độ bo tròn
                                                },
                                            },
                                        }}
                                    />
                                    <IconButton
                                        color="primary"
                                        disabled={connectionStatus[selectedUser] !== "connected"}
                                        onClick={handleSendTextMessage}
                                    >
                                        <SendIcon />
                                    </IconButton>
                                </Box>
                            </>
                        )}



                    </Paper>
                </Grid>
                <Dialog open={!!connectionRequest} onClose={handleRejectConnection}>
                    <DialogTitle>Connection Request</DialogTitle>
                    <DialogContent>
                        <Typography>
                            User <strong>{connectionRequest?.username}</strong> with Peer ID <strong>{connectionRequest?.id}</strong> wants to connect.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleRejectConnection} color="secondary">
                            Reject
                        </Button>
                        <Button onClick={handleAcceptConnection} color="primary">
                            Accept
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={!!videoCallRequest} onClose={handleRejectVideoCall}>
                    <DialogTitle>Video Call Request</DialogTitle>
                    <DialogContent>
                        <Typography>
                            User <strong>{videoCallRequest?.username}</strong> with Peer ID <strong>{videoCallRequest?.id}</strong> wants to call video.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleRejectVideoCall} color="secondary">
                            Reject
                        </Button>
                        <Button onClick={handleAcceptVideoCall} color="primary">
                            Accept
                        </Button>
                    </DialogActions>
                </Dialog>
            </Grid>
        </Box >
    );
};

export default MainPage;