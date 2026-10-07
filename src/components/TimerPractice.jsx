import {useEffect, useRef, useState} from 'react';
  const TimerPractice = () => {
   const [seconds, setSeconds] = useState(0);
   const timerRef = useRef(0);
   const startTimer = () => {
       if(timerRef.current) return;
       timerRef.current = setInterval(
        () => {
          setSeconds((s) => s + 1);
        }
       , 1000);
   }

   const stopTimer = () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
   }

   return (
     <div>
       <button onClick={startTimer}>Start</button>
       <button onClick={stopTimer}>Stop</button>
       <p>Seconds: {seconds}</p>
     </div>
   );
  }

  export {TimerPractice};

  