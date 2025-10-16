import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Bridge } from './pages/Bridge';
import { Faucet } from './pages/Faucet';
import { Explorer } from './pages/Explorer';
import { Widget } from './pages/Widget';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Bridge />} />
          <Route path="/faucet" element={<Faucet />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/widget" element={<Widget />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
