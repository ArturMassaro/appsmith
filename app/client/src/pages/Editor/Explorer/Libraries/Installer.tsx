import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import {
  Button,
  Category,
  FormGroup,
  Icon,
  IconSize,
  Size,
  Spinner,
  Text,
  TextInput,
  TextType,
  Toaster,
  Variant,
} from "design-system";
import { createMessage, customJSLibraryMessages } from "ce/constants/messages";
import ProfileImage from "pages/common/ProfileImage";
import { Colors } from "constants/Colors";
import { isValidURL } from "utils/URLUtils";
import { useDispatch, useSelector } from "react-redux";
import {
  selectInstallationStatus,
  selectInstalledLibraries,
  selectIsInstallerOpen,
  selectIsLibraryInstalled,
  selectQueuedLibraries,
  selectStatusForURL,
} from "selectors/entitiesSelector";
import SaveSuccessIcon from "remixicon-react/CheckboxCircleFillIcon";
import { InstallState } from "reducers/uiReducers/libraryReducer";
import recommendedLibraries, {
  TRecommendedLibrary,
} from "pages/Editor/Explorer/Libraries/recommendedLibraries";
import { AppState } from "ce/reducers";
import { TJSLibrary } from "utils/DynamicBindingUtils";
import {
  clearInstalls,
  installLibraryInit,
  toggleInstaller,
} from "actions/JSLibraryActions";
import classNames from "classnames";

const Wrapper = styled.div<{ left: number }>`
  display: flex;
  height: auto;
  width: 400px;
  max-height: 80vh;
  flex-direction: column;
  padding: 0 24px 4px;
  position: absolute;
  background: white;
  z-index: 25;
  left: ${(props) => props.left}px;
  bottom: 10px;
  .installation-header {
    padding: 20px 0 0;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .search-area {
    margin-bottom: 16px;
    .left-icon {
      margin-left: 14px;
      .cs-icon {
        margin-right: 0;
      }
    }
    .bp3-form-group {
      margin: 0;
    }
    .bp3-label {
      font-size: 12px;
    }
    display: flex;
    flex-direction: column;
    .search-bar {
      margin-bottom: 8px;
    }
  }
  .search-body {
    display: flex;
    flex-direction: column;
    .search-CTA {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
    }
    .search-results {
      .library-card {
        gap: 8px;
        padding: 8px 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-bottom: 1px solid var(--appsmith-color-black-100);
        .description {
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          font-size: 12px;
          line-clamp: 2;
          font-weight: 400;
          -webkit-box-orient: vertical;
        }
      }
      .library-card.no-border {
        border-bottom: none;
      }
    }
  }
`;

const InstallationProgressWrapper = styled.div<{ addBorder: boolean }>`
  border-top: ${(props) =>
    props.addBorder ? `1px solid var(--appsmith-color-black-300)` : "none"};
  display: flex;
  flex-direction: column;
  background: var(--appsmith-color-black-50);
  text-overflow: ellipsis;
  padding: 8px 8px 12px;
  .install-url {
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-all;
  }
  .error-card {
    display: flex;
    padding: 10px;
    flex-direction: row;
    background: #ffe9e9;
    .unsupported {
      line-height: 17px;
      .header {
        font-size: 13px;
        font-weight: 600;
        color: #393939;
      }
      .body {
        font-size: 12px;
        font-weight: 400;
      }
    }
  }
`;

const StatusIconWrapper = styled.div<{ addHoverState: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: initial;
  ${(props) =>
    props.addHoverState
      ? `
    &:hover {
      cursor: pointer;
      background: ${Colors.SHARK2} !important;
      svg {
        path {
          fill: ${Colors.WHITE} !important;
        }
      }
    }
  `
      : ""}
`;

function StatusIcon(props: {
  status: InstallState;
  isInstalled?: boolean;
  action?: any;
}) {
  const { action, isInstalled = false, status } = props;
  const actionProps = useMemo(() => (action ? { onClick: action } : {}), [
    action,
  ]);
  if (status === InstallState.Success || isInstalled)
    return (
      <StatusIconWrapper addHoverState={false}>
        <SaveSuccessIcon color={Colors.GREEN} size={18} />
      </StatusIconWrapper>
    );
  if (status === InstallState.Failed)
    return (
      <StatusIconWrapper addHoverState={false}>
        <Icon fillColor={Colors.GRAY} name="warning-line" size={IconSize.XL} />
      </StatusIconWrapper>
    );
  if (status === InstallState.Queued)
    return (
      <StatusIconWrapper addHoverState={false}>
        <Spinner />
      </StatusIconWrapper>
    );
  return (
    <StatusIconWrapper addHoverState>
      <Icon
        fillColor={Colors.GRAY}
        name="download"
        size={IconSize.XL}
        {...actionProps}
      />
    </StatusIconWrapper>
  );
}

function ProgressTracker({
  isFirst,
  isLast,
  status,
  url,
}: {
  isFirst: boolean;
  isLast: boolean;
  status: InstallState;
  url: string;
}) {
  return (
    <InstallationProgressWrapper
      addBorder={!isFirst}
      className={classNames({
        "mb-2": isLast,
      })}
    >
      {[InstallState.Queued, InstallState.Installing].includes(status) && (
        <div className="text-gray-700 text-xs">Installing...</div>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center gap-2 fw-500 text-sm">
          <div className="install-url text-sm font-medium">{url}</div>
          <div className="shrink-0">
            <StatusIcon status={status} />
          </div>
        </div>
        {status === InstallState.Failed && (
          <div className="gap-2 error-card items-start">
            <Icon name="danger" size={IconSize.XL} />
            <div className="flex flex-col unsupported gap-1">
              <div className="header">
                {createMessage(customJSLibraryMessages.UNSUPPORTED_LIB)}
              </div>
              <div className="body">
                {createMessage(customJSLibraryMessages.UNSUPPORTED_LIB_DESC)}
              </div>
              <div className="footer text-xs font-medium gap-2 flex flex-row">
                <a>{createMessage(customJSLibraryMessages.REPORT_ISSUE)}</a>
                <a>{createMessage(customJSLibraryMessages.LEARN_MORE)}</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </InstallationProgressWrapper>
  );
}

function InstallationProgress() {
  const installStatusMap = useSelector(selectInstallationStatus);
  const urls = Object.keys(installStatusMap).filter(
    (url) => !recommendedLibraries.find((lib) => lib.url === url),
  );
  if (urls.length === 0) return null;
  return (
    <div>
      {urls.reverse().map((url, idx) => (
        <ProgressTracker
          isFirst={idx === 0}
          isLast={idx === urls.length - 1}
          key={`${url}_${idx}`}
          status={installStatusMap[url]}
          url={url}
        />
      ))}
    </div>
  );
}

enum Repo {
  Unpkg,
  JsDelivr,
}

export function Installer(props: { left: number }) {
  const { left } = props;
  const [URL, setURL] = useState("");
  const [isValid, setIsValid] = useState(true);
  const dispatch = useDispatch();
  const installedLibraries = useSelector(selectInstalledLibraries);
  const queuedLibraries = useSelector(selectQueuedLibraries);
  const isOpen = useSelector(selectIsInstallerOpen);
  const installerRef = useRef<HTMLDivElement>(null);

  const closeInstaller = useCallback(() => {
    dispatch(clearInstalls());
    dispatch(toggleInstaller(false));
  }, []);

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    const paths = e.composedPath();
    if (
      installerRef &&
      installerRef.current &&
      !paths?.includes(installerRef.current)
    )
      closeInstaller();
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const updateURL = useCallback((value: string) => {
    setURL(value);
  }, []);

  const openDoc = useCallback((e, repo: Repo) => {
    e.preventDefault();
    if (repo === Repo.Unpkg) return window.open("https://unpkg.com");
    window.open("https://www.jsdelivr.com/");
  }, []);

  const validate = useCallback((text) => {
    const isValid = !text || isValidURL(text);
    setIsValid(isValid);
    return {
      isValid,
      message: isValid ? "" : "Please enter a valid URL",
    };
  }, []);

  const installLibrary = useCallback(
    (lib?: Partial<TJSLibrary>) => {
      const url = lib?.url || URL;
      const isQueued = queuedLibraries.find((libURL) => libURL === url);
      if (isQueued) return;

      const libInstalled = installedLibraries.find((lib) => lib.url === url);
      if (libInstalled) {
        Toaster.show({
          text: createMessage(
            customJSLibraryMessages.INSTALLED_ALREADY,
            libInstalled.accessor,
          ),
          variant: Variant.info,
        });
        return;
      }
      dispatch(
        installLibraryInit({
          url,
          name: lib?.name,
        }),
      );
    },
    [URL, installedLibraries, queuedLibraries],
  );

  return !isOpen ? null : (
    <Wrapper className="bp3-popover" left={left} ref={installerRef}>
      <div className="installation-header">
        <Text type={TextType.H1} weight={"bold"}>
          {createMessage(customJSLibraryMessages.ADD_JS_LIBRARY)}
        </Text>
        <Icon
          fillColor={Colors.GRAY}
          name="close-modal"
          onClick={closeInstaller}
          size={IconSize.XXL}
        />
      </div>
      <div className="search-area">
        <div className="flex flex-row gap-2 justify-between items-end">
          <FormGroup className="flex-1" label={"Library URL"}>
            <TextInput
              $padding="12px"
              data-testid="library-url"
              height="30px"
              label={"Library URL"}
              leftIcon="link-2"
              onChange={updateURL}
              padding="12px"
              placeholder="https://cdn.jsdelivr.net/npm/example@1.1.1/example.min.js"
              validator={validate}
              width="100%"
            />
          </FormGroup>
          <Button
            category={Category.primary}
            data-testid="install-library-btn"
            disabled={!(URL && isValid)}
            icon="download"
            onClick={() => installLibrary()}
            size={Size.medium}
            tag="button"
            text="INSTALL"
            type="button"
          />
        </div>
      </div>
      <div className="search-body overflow-auto">
        <div className="search-CTA mb-3 text-xs">
          <span>
            Explore libraries on{" "}
            <a
              className="text-primary-500"
              onClick={(e) => openDoc(e, Repo.JsDelivr)}
            >
              jsDelivr
            </a>
            {". "}
            {createMessage(customJSLibraryMessages.LEARN_MORE_DESC)}{" "}
            <a
              className="text-primary-500"
              onClick={(e) => openDoc(e, Repo.Unpkg)}
            >
              here
            </a>
            {"."}
          </span>
        </div>
        <InstallationProgress />
        <div className="pb-2 sticky top-0 z-2 bg-white">
          <Text type={TextType.P1} weight={"600"}>
            {createMessage(customJSLibraryMessages.REC_LIBRARY)}
          </Text>
        </div>
        <div className="search-results">
          {recommendedLibraries.map((lib, idx) => (
            <LibraryCard
              isLastCard={idx === recommendedLibraries.length - 1}
              key={`${idx}_${lib.name}`}
              lib={lib}
              onClick={() => installLibrary(lib)}
            />
          ))}
        </div>
      </div>
    </Wrapper>
  );
}

function LibraryCard({
  isLastCard,
  lib,
  onClick,
}: {
  lib: TRecommendedLibrary;
  onClick: (url: string) => void;
  isLastCard: boolean;
}) {
  const status = useSelector(selectStatusForURL(lib.url));
  const isInstalled = useSelector((state: AppState) =>
    selectIsLibraryInstalled(state, lib.url),
  );
  const openDocs = useCallback((url: string) => window.open(url), []);
  return (
    <div
      className={classNames({ "library-card": true, "no-border": isLastCard })}
    >
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2 items-center">
          <Text type={TextType.P0} weight="500">
            {lib.name}
          </Text>
          <StatusIconWrapper addHoverState>
            <Icon
              fillColor={Colors.GRAY}
              name="share-2"
              onClick={() => openDocs(lib.docsURL)}
              size={IconSize.SMALL}
            />
          </StatusIconWrapper>
        </div>
        <div className="mr-2">
          <StatusIcon
            action={onClick}
            isInstalled={isInstalled}
            status={status}
          />
        </div>
      </div>
      <div className="flex flex-row description">{lib.description}</div>
      <div className="flex flex-row items-center gap-1">
        <ProfileImage size={20} source={lib.icon} />
        <Text type={TextType.P3}>{lib.author}</Text>
      </div>
    </div>
  );
}
