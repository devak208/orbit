import { useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const ExcalidrawWrapper = forwardRef(function ExcalidrawWrapper({ onAPIReady, excalidrawAPI, initialData, onChange, onPointerUpdate, ...props }, ref) {
  const excalidrawAPIRef = useRef(null);
  const [ready, setReady] = useState(false);
  const isApplyingRemoteUpdate = useRef(false);
  const lastPointerUpdate = useRef(0);

  // Expose the full Excalidraw API to parent component
  useImperativeHandle(ref, () => ({
    updateScene: (sceneData) => {
      if (excalidrawAPIRef.current) {
        console.log('🔄 [EXCALIDRAW] Updating scene with:', sceneData);
        isApplyingRemoteUpdate.current = true;
        
        // Only update elements, preserve local appState for independent tools/cursors
        const currentAppState = excalidrawAPIRef.current.getAppState();
        excalidrawAPIRef.current.updateScene({
          elements: sceneData.elements || [],
          appState: {
            ...currentAppState,
            // Only sync certain collaborative properties, keep tools independent
            collaborators: sceneData.appState?.collaborators || currentAppState.collaborators
          }
        });
        
        // Reset the flag immediately using next tick
        setTimeout(() => {
          isApplyingRemoteUpdate.current = false;
        }, 0);
      } else {
        console.warn('⚠️ [EXCALIDRAW] API not ready for updateScene');
      }
    },
    updateCollaborators: (collaborators) => {
      if (excalidrawAPIRef.current) {
        const currentAppState = excalidrawAPIRef.current.getAppState();
        excalidrawAPIRef.current.updateScene({
          appState: {
            ...currentAppState,
            collaborators
          }
        });
      }
    },
    getSceneElements: () => excalidrawAPIRef.current?.getSceneElements(),
    getAppState: () => excalidrawAPIRef.current?.getAppState(),
    exportToBlob: (options) => excalidrawAPIRef.current?.exportToBlob(options),
    ready: () => ready
  }), [ready]);


  const handleExcalidrawAPI = (api) => {
    console.log('🔗 [EXCALIDRAW] API initialized');
    console.log('✅ [EXCALIDRAW] Setting API ready state to true');
    excalidrawAPIRef.current = api;
    console.log('🔗 [EXCALIDRAW] API reference set');
    setReady(true);
    
    // Create wrapper API object - ready is now true
    const wrapperAPI = {
      updateScene: (sceneData) => {
        if (excalidrawAPIRef.current) {
          console.log('🔄 [EXCALIDRAW] Updating scene with:', sceneData);
          isApplyingRemoteUpdate.current = true;
          
          // Only update elements, preserve local appState for independent tools/cursors
          const currentAppState = excalidrawAPIRef.current.getAppState();
          excalidrawAPIRef.current.updateScene({
            elements: sceneData.elements || [],
            appState: {
              ...currentAppState,
              // Only sync certain collaborative properties, keep tools independent
              collaborators: sceneData.appState?.collaborators || currentAppState.collaborators
            }
          });
          
          // Reset the flag immediately using next tick
          setTimeout(() => {
            isApplyingRemoteUpdate.current = false;
          }, 0);
        } else {
          console.warn('⚠️ [EXCALIDRAW] API not ready for updateScene');
        }
      },
      updateCollaborators: (collaborators) => {
        if (excalidrawAPIRef.current) {
          const currentAppState = excalidrawAPIRef.current.getAppState();
          excalidrawAPIRef.current.updateScene({
            appState: {
              ...currentAppState,
              collaborators
            }
          });
        }
      },
      getSceneElements: () => excalidrawAPIRef.current?.getSceneElements(),
      getAppState: () => excalidrawAPIRef.current?.getAppState(),
      exportToBlob: (options) => excalidrawAPIRef.current?.exportToBlob(options),
      ready: () => {
        const isReady = !!excalidrawAPIRef.current;
        console.log(`🟢 [EXCALIDRAW] Ready state checked: ${isReady} (API exists: ${!!excalidrawAPIRef.current})`);
        return isReady;
      }
    };
    
    if (onAPIReady) {
      console.log('📤 [EXCALIDRAW] Calling onAPIReady with wrapper API');
      onAPIReady(wrapperAPI);
    }
    if (excalidrawAPI) {
      excalidrawAPI(api);
    }
  };

  // Wrapper for onChange to prevent infinite loops
  const handleChange = (elements, appState, files) => {
    if (isApplyingRemoteUpdate.current) {
      console.log('🚫 [EXCALIDRAW] Skipping onChange during remote update');
      return;
    }
    if (onChange) {
      onChange(elements, appState, files);
    }
  };

  // Handle pointer updates for collaborative cursors
  const handlePointerUpdate = useCallback((payload) => {
    const now = Date.now();
    if (now - lastPointerUpdate.current < 50) return; // Throttle to 20fps
    lastPointerUpdate.current = now;
  
    if (onPointerUpdate && !isApplyingRemoteUpdate.current) {
      onPointerUpdate(payload); // Ensure full payload is sent for cursors
    }
  }, [onPointerUpdate]);

  return (
    <div className="excalidraw-container" style={{ 
      height: "100%", 
      width: "100%",
      position: "relative"
    }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        initialData={initialData}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        // Disable image handling to prevent Pica errors
        onDrop={null}
        onPaste={null}
        // Enable keyboard globally for proper typing and undo functionality
        handleKeyboardGlobally={true}
        {...props}
      />
    </div>
  );
});

export default ExcalidrawWrapper;
