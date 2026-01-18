import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomAlert from '../components/UI/CustomAlert';

export type AlertButton = { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' };

interface AlertContextValue {
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
});

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);

  const showAlert = (t: string, m: string, b?: AlertButton[]) => {
    setTitle(t);
    setMessage(m);
    setButtons(b && b.length > 0 ? b : [{ text: 'OK', style: 'default' }]);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  const onButtonPress = (btn: AlertButton) => {
    try {
      btn.onPress && btn.onPress();
    } catch (e) {
      // swallow
      console.error('Alert button error', e);
    }
    hideAlert();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        title={title}
        message={message}
        buttons={buttons}
        onRequestClose={hideAlert}
        onButtonPress={onButtonPress}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
