import { useEffect } from 'react';

// this hook implements https://stackoverflow.com/a/34425083
// with some modifications, see below comments

const useScript = ({src, async, onLoad}) => {
  useEffect(() => {
    // this is the order recommended by
    // https://stackoverflow.com/questions/16230886/trying-to-fire-the-onload-event-on-script-tag
    // because "If the script is cached, then as soon as you add the src 
    // the item is loaded and onload does not fire. Adding the onload before the src
    // will ensure that onload fires for cached scripts."
    const script = document.createElement('script');
    document.body.appendChild(script);
    script.onload = onLoad;
    script.async = async ?? false;
    script.src = src;

    return () => {
      document.body.removeChild(script);
    }
  }, [src, async, onLoad]);
};

export default useScript;