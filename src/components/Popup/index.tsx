import React, { createRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { isDOMElement } from '@utils/is';
import PopupComponent, { type PopupMethods } from './Popup';
import { uniqueId } from 'lodash-es';
export { type PopupProps } from './Popup';

export class PopupClass implements PopupMethods {
  popupRef: RefObject<PopupMethods>;
  show: PopupMethods['show'];
  hide: PopupMethods['hide'];
  hideAll: PopupMethods['hideAll'];
  setMaskStyle: PopupMethods['setMaskStyle'];
  setMaskClassName: PopupMethods['setMaskClassName'];
  setMaskClickHandler: PopupMethods['setMaskClickHandler'];
  setListStyle: PopupMethods['setListStyle'];
  setListClassName: PopupMethods['setListClassName'];
  setItemWrapperStyle: PopupMethods['setItemWrapperStyle'];
  setItemWrapperClassName: PopupMethods['setItemWrapperClassName'];
  setAnimatedSize: PopupMethods['setAnimatedSize'];
  isInInit: boolean = false;
  isEndInit: boolean = false;
  useProvider: boolean = false;
  completeInit!: (value: PromiseLike<void> | void) => void;
  initPromise: Promise<void>;

  constructor(useProvider: boolean = false) {
    this.popupRef = createRef<PopupMethods>();
    this.show = (args) => this.judgeInit('show', args);
    this.hide = (args) => this.judgeInit('hide', args);
    this.hideAll = () => this.judgeInit('hideAll');
    this.setMaskStyle = (args) => this.judgeInit('setMaskStyle', args);
    this.setMaskClassName = (args) => this.judgeInit('setMaskClassName', args);
    this.setMaskClickHandler = (args) => this.judgeInit('setMaskClickHandler', args);
    this.setListStyle = (args) => this.judgeInit('setListStyle', args);
    this.setListClassName = (args) => this.judgeInit('setListClassName', args);
    this.setItemWrapperStyle = (args) => this.judgeInit('setItemWrapperStyle', args);
    this.setItemWrapperClassName = (args) => this.judgeInit('setItemWrapperClassName', args);
    this.setAnimatedSize = (args) => this.judgeInit('setAnimatedSize', args);
    this.initPromise = new Promise((resolve) => (this.completeInit = resolve));
    this.useProvider = useProvider; 
  }

  judgeInit(method: keyof PopupMethods, args?: any): any {
    
  }

  resetMethod = () => {
    this.show = this.popupRef.current!.show;
    this.hide = this.popupRef.current!.hide;
    this.hideAll = this.popupRef.current!.hideAll;
    this.setMaskStyle = this.popupRef.current!.setMaskStyle;
    this.setMaskClassName = this.popupRef.current!.setMaskClassName;
    this.setMaskClickHandler = this.popupRef.current!.setMaskClickHandler;
    this.setListStyle = this.popupRef.current!.setListStyle;
    this.setListClassName = this.popupRef.current!.setListClassName;
    this.setItemWrapperStyle = this.popupRef.current!.setItemWrapperStyle;
    this.setItemWrapperClassName = this.popupRef.current!.setItemWrapperClassName;
    this.setAnimatedSize = this.popupRef.current!.setAnimatedSize;
  };

  waitRefReady = () => {
    const judgeIsReady = () => {
      if (this.popupRef.current) {
        this.completeInit();
        this.resetMethod();
      } else {
        setTimeout(judgeIsReady, 16);
      }
    };
    judgeIsReady();
    return this.initPromise;
  };

  init = async (container?: HTMLElement) => {
    if (!container || !isDOMElement(container)) {
      container = document.createElement('div');
      container.setAttribute('id', 'popup-container-' + uniqueId());
      container.style.position = 'absolute';
      document.body.appendChild(container);
    }
    createRoot(container).render(<PopupComponent ref={this.popupRef} />);
    await this.waitRefReady();
    this.isEndInit = true;
  };

  Provider = ({ container }: { container?: HTMLElement; [otherProps: string]: any }) => {
    if (!container || !isDOMElement(container)) {
      container = document.createElement('div');
      container.setAttribute('id', 'popup-container-' + uniqueId());
      container.style.position = 'absolute';
      container.style.zIndex = '10000';
      document.body.appendChild(container);
    }
    const component = createPortal(React.createElement(PopupComponent, { ref: this.popupRef }), container);
    this.waitRefReady().then(() => {
      this.isEndInit = true;
    });
    return component;
  };
}

export default new PopupClass();
