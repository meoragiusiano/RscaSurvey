import React, { useState, useEffect } from 'react';

const ParsonsProblem = ({ question, currentAnswer, handleAnswer }) => {
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    if (!currentAnswer || currentAnswer.length === 0) {
      const initialAnswer = new Array(question.correctOrder.length).fill(null);
      handleAnswer(initialAnswer); 
    }
  }, []); 

  const handleDragStart = (event, item) => {
    console.log(`Drag started with item: ${item}`);
    setDraggedItem(item);
  };

  const handleDrop = (event, targetItem, targetIndex) => {
    event.preventDefault();

    console.log("Current Answer:", currentAnswer);
    console.log("Dragged Item:", draggedItem);
    console.log("Target Item:", targetItem);
    console.log("Target Index:", targetIndex);

    const updatedAnswer = [...currentAnswer]; 

    console.log("Before update:", updatedAnswer);

    updatedAnswer[targetIndex] = draggedItem;

    console.log("Updated answer after drag:", updatedAnswer);

    handleAnswer(updatedAnswer);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    console.log("Updated currentAnswer (useEffect):", currentAnswer);
  }, [currentAnswer]);

  return (
    <div className="parsons-problem" style={{ maxWidth: '100%', padding: '20px' }}>
      <div className="draggable-items" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        justifyContent: 'flex-start',
      }}>
        {question.options.map((item, index) => (
          <div
            key={index}
            className="draggable-item"
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragOver={handleDragOver}
            style={{
              backgroundColor: draggedItem === item ? 'lightblue' : 'white',
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              cursor: 'move',
              transition: 'background-color 0.3s ease',
              minWidth: '80px', 
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <div className="target-areas" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '20px',
      }}>
        {question.correctOrder.map((targetItem, index) => (
          <div
            key={index}
            className="target-area"
            onDrop={(e) => handleDrop(e, targetItem, index)}
            onDragOver={handleDragOver}
            style={{
              padding: '20px 40px',
              width: '100%',  
              height: '100px',
              border: '2px dashed #ccc',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              textAlign: 'center',
            }}
          >
            {currentAnswer[index] !== null ? (
              <span>{currentAnswer[index]}</span>
            ) : (
              <span>Empty</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParsonsProblem;
