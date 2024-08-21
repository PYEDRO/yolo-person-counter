import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { Stage, Layer, Line } from 'react-konva';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [processedVideo, setProcessedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [isDrawingStage, setIsDrawingStage] = useState(false);
  const [showOriginalVideo, setShowOriginalVideo] = useState(true); // Novo estado
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const [videoGet, setVideoGet] = useState();

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      console.log("URL:", url);
      setVideoURL(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  const handleVideoUpload = (event) => {
    setVideoFile(event.target.files[0]);
    setProcessedVideo(null);
    setShowOriginalVideo(true); // Mostrar o vídeo original ao fazer upload
  };

  const handleMouseDown = (event) => {
    if (isDrawingStage && !drawing) {
      const { x, y } = event.target.getStage().getPointerPosition();
      setPolygons([...polygons, [{ x, y }]]);
      setDrawing(true);
    }
  };

  const handleMouseMove = (event) => {
    if (isDrawingStage && drawing) {
      const { x, y } = event.target.getStage().getPointerPosition();
      const lastPolygon = polygons[polygons.length - 1];
      lastPolygon.push({ x, y });
      setPolygons(polygons.slice(0, -1).concat([lastPolygon]));
    }
  };

  const handleMouseUp = () => {
    if (isDrawingStage) {
      setDrawing(false);
    }
  };

  const handleStartDrawing = () => {
    setIsDrawingStage(true);
  };

  const handleProcessVideo = async () => {
    if (!videoFile || polygons.length === 0) {
      alert('Please upload a video and define a polygon.');
      return;
    }
  
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    const canvasWidth = stageRef.current.width();
    const canvasHeight = stageRef.current.height();
  
    const polygonData = polygons.map((polygon) =>
      polygon.map((point) => [
        (point.x / canvasWidth) * videoWidth,
        (point.y / canvasHeight) * videoHeight,
      ])
    );

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('polygon', JSON.stringify(polygonData));

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const videoFilename = data.video_filename;
        const videoURL = `http://localhost:8000/videos/${videoFilename}`;
        setProcessedVideo(videoURL);
        setVideoGet(videoFilename);
        setShowOriginalVideo(false); // Ocultar o vídeo original após o processamento
      } else {
        alert('Failed to process video.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing video.');
    }

    setLoading(false);
  };

  useEffect(() => {
    const fetchProcessedVideo = async () => {
      if (!videoGet) return;

      try {
        const responseGet = await fetch(`http://localhost:8000/videos/${videoGet}`, {
          method: 'GET',
        });
        console.log("Aqui está a URL", responseGet);
        if (responseGet.ok) {
          setProcessedVideo(`http://localhost:8000/videos/${videoGet}`);
        } else {
          console.log("Erro ao buscar vídeo processado");
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchProcessedVideo();
  }, [videoGet]);

  return (
    <div className="App">
      <h1>People Counting.</h1>

      {/* Condição para esconder o botão de upload se o vídeo estiver carregado */}
      {!videoFile && (
        <>
          <label htmlFor="file-upload" className="custom-file-upload">
            Carregar Vídeo
          </label>
          <input id="file-upload" type="file" accept="video/*" onChange={handleVideoUpload} />
        </>
      )}

      <div className="video-container">
        {showOriginalVideo && videoURL && (
          <video ref={videoRef} src={videoURL} controls />
        )}
        {videoURL && isDrawingStage && showOriginalVideo && (
          <Stage
            ref={stageRef}
            width={videoRef.current ? videoRef.current.clientWidth : 800}
            height={videoRef.current ? videoRef.current.clientHeight : 600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <Layer>
              {polygons.map((polygon, index) => (
                <Line
                  key={index}
                  points={polygon.flatMap((point) => [point.x, point.y])}
                  stroke="black"
                  strokeWidth={2}
                  closed
                />
              ))}
            </Layer>
          </Stage>
        )}
      </div>
      <div className="button-container">
        {!isDrawingStage && videoURL && showOriginalVideo && (
          <button onClick={handleStartDrawing}>Start Drawing Polygons</button>
        )}
        {isDrawingStage && (
          <button onClick={handleProcessVideo}>Apply Analytic</button>
        )}
      </div>
      {loading && <div className="processing">Processing...</div>}
      {processedVideo && !showOriginalVideo && (
        <div className="processed-video-container">
          <h2>Processed Video</h2>
          <video
            ref={videoRef}
            className="processed-video"
            src={processedVideo}
            controls
            key={processedVideo}
          />
        </div>
      )}
    </div>
  );
}

export default App;
