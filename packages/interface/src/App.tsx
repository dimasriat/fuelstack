import { useState, useEffect } from "react";
import { connect, disconnect, isConnected, request } from "@stacks/connect";
import {
  fetchCallReadOnlyFunction,
  stringUtf8CV,
  uintCV,
  type ClarityValue,
  type SomeCV,
  type StringUtf8CV,
  type UIntCV,
} from "@stacks/transactions";
import "./App.css";

const network = "mainnet";

// Replace with your contract address
const CONTRACT_ADDRESS = "SP3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3NC2XKB8";
const CONTRACT_NAME = "message_board";

type Message = {
    id: number;
    content: string;
};

function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setConnected(isConnected());
    if (isConnected()) {
      loadMessages();
    }
  }, []);

  // Check for connection changes
  useEffect(() => {
    const checkConnection = () => {
      const connectionStatus = isConnected();
      if (connectionStatus !== connected) {
        setConnected(connectionStatus);
        if (connectionStatus) {
          loadMessages();
        }
      }
    };

    const intervalId = setInterval(checkConnection, 500);
    return () => clearInterval(intervalId);
  }, [connected]);

  const connectWallet = async () => {
    try {
      // await connect({
      //   appDetails: {
      //     name: "Message Board",
      //     icon: window.location.origin + "/logo.svg",
      //   },
      //   onFinish: () => {
      //     setConnected(true);
      //     // Small delay to ensure connection is fully established
      //     setTimeout(() => {
      //       loadMessages();
      //     }, 100);
      //   },
      // });
      await connect();
      setConnected(true);
      setTimeout(() => {
        loadMessages();
      }, 100);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setConnected(false);
    setMessages([]);
  };

  const loadMessages = async () => {
    try {
      // Get message count
      const countResult = (await fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "get-message-count",
        functionArgs: [],
        network,
        senderAddress: CONTRACT_ADDRESS,
      })) as unknown as UIntCV;

      const count = parseInt(countResult.value as string);

      // Load recent messages
      const messagePromises: Promise<ClarityValue>[] = [];
      for (let i = Math.max(1, count - 4); i <= count; i++) {
        messagePromises.push(
          fetchCallReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: "get-message",
            functionArgs: [uintCV(i)],
            network,
            senderAddress: CONTRACT_ADDRESS,
          })
        );
      }

      const messageResults = await Promise.all(messagePromises);
      const loadedMessages = messageResults
        .map((result, index) => ({
          id: count - messageResults.length + index + 1,
          content: ((result as SomeCV).value as StringUtf8CV).value,
        }))
        .filter((msg) => msg.content !== undefined);

      setMessages(loadedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const postMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const result = await request("stx_callContract", {
        contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        functionName: "add-message",
        functionArgs: [stringUtf8CV(newMessage)],
        network,
      });

      console.log("Transaction submitted:", result.txid);
      setNewMessage("");

      // Reload messages after a delay to allow the transaction to process
      setTimeout(() => {
        loadMessages();
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Error posting message:", error);
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📝 Stacks Message Board</h1>

        {!connected ? (
          <button onClick={connectWallet} className="connect-button">
            Connect Wallet
          </button>
        ) : (
          <button onClick={disconnectWallet} className="disconnect-button">
            Disconnect
          </button>
        )}
      </header>

      {connected && (
        <main className="App-main">
          <div className="post-message">
            <h2>Post a Message</h2>
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={280}
                disabled={loading}
              />
              <button
                onClick={postMessage}
                disabled={loading || !newMessage.trim()}
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          <div className="messages">
            <h2>Recent Messages</h2>
            <button onClick={loadMessages} className="refresh-button">
              Refresh
            </button>
            {messages.length === 0 ? (
              <p>No messages yet. Be the first to post!</p>
            ) : (
              <ul>
                {messages.map((message) => (
                  <li key={message.id}>
                    <strong>Message #{message.id}:</strong> {message.content}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
