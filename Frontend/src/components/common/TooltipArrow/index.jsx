import { Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
import { truncate } from "lodash";
import cn from "../../../lib/classnames";
import { decodeHtml } from "../../../lib/stringsUtils";
import styles from "./styles.module.scss";

export default function TooltipArrow(props) {
  const {
    lineClamp,
    overlayClassName,
    children,
    title,
    truncateNumber,
    lineWidth,
    maxWidth = 200, 
    keepHtml,
    styleWrapper,
    isShow,
    setShow,
    placement = "top", 
  } = props;

  const tooltipContentRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(true); 

  useEffect(() => {
    if (tooltipContentRef.current) {
   
      if (isShow) {
        setShowTooltip(60 < tooltipContentRef.current.clientHeight);
      } else {
        setShowTooltip(
          tooltipContentRef.current.scrollHeight >
            tooltipContentRef.current.clientHeight
        );
      }
    }
  }, [isShow]);

 
  const renderTitle = (text) =>
    keepHtml ? (
      <div dangerouslySetInnerHTML={{ __html: text }} />
    ) : (
      decodeHtml(text) 
    );

  let style = { ...styleWrapper };

  return (
    <div style={style}>
      <style global jsx>{`
        .line-clamp-${lineClamp} {
          -webkit-line-clamp: ${lineClamp};
        }
        .line-width-${lineWidth} {
          width: ${lineWidth}px;
        }
        .custom-tooltip {
          max-width: ${maxWidth}px;
        }
      `}</style>
      <Tooltip
        placement={placement}
        {...props}
        title={title && renderTitle(title)}
        className={isShow ? styles.showFull : styles.truncateOneLine} 
        overlayClassName={cn(`${overlayClassName} custom-tooltip`, {
          "d-none": !showTooltip,
        })}
        autoAdjustOverflow={true}
      >
        <div ref={tooltipContentRef}>
          <span className={styles.tooltipContent}>{children}</span>
        </div>
      </Tooltip>
    </div>
  );
}