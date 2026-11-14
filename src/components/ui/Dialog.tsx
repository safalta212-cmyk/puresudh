import React from 'react';
import { Modal, ModalProps } from './Modal';

export interface DialogProps extends Omit<ModalProps, 'children'> {
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  footer,
  ...props
}) => {
  return (
    <Modal {...props}>
      <div className="space-y-4">
        {children}
        {footer && (
          <div className="pt-4 mt-6 border-t border-stone-200 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default Dialog;
