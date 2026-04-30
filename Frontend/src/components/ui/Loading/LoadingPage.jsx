import HashLoader from 'react-spinners/HashLoader';

export default function LoadingPage({isVisible}) {
    if (!isVisible) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      backgroundColor: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <HashLoader />
    </div>
  )
}
