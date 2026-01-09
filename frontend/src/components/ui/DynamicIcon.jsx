import { getIcon } from "../../lib/utils";

// Wrapper component to render icons using the getIcon utility.
// getIcon 유틸리티를 사용하여 아이콘을 렌더링하는 래퍼 컴포넌트
const DynamicIcon = ({ name, className, ...props }) => {
  return getIcon(name, { className, ...props });
};

export default DynamicIcon;
