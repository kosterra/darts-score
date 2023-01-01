import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';

const SelectableCard = (props) => {
    const { item, isSelected, selectable, onSelectCard } = props

    const handleCardSelect=()=>{
        if (selectable || (isSelected && !selectable)) {
            onSelectCard(item);
        }
    }

    return (
        <Col className="mb-3">
            <Card as='a'
                onClick={handleCardSelect}
                className={`h-100 m-0 p-0 rounded-0 selectable-card bg-tertiary ${isSelected ? 'selected' : ''} ${!selectable && !isSelected ? 'disabled' : ''}`}>
                <Card.Body className="m-0 p-0 border-0 rounded-0 bg-tertiary">
                    <Card.Title as="h6" className="bg-primary p-2 mb-0 text-light text-center span">
                        {item.nickname}
                    </Card.Title>
                    <Card.Text as="div" className="p-2 text-light">
                        <span>{item.firstname + ' ' + item.lastname}</span>
                    </Card.Text>
                </Card.Body>
                { isSelected &&
                    <i className="fas fa-check-circle"/>
                }
            </Card>
        </Col>
    );
}

const SelectableCardList = (props) => {
    const {
        itemType,
        items,
        selectedItems,
        emptyText,
        maxSelectable,
        setSelectedItems } = props

    const onSelectCard=(item) => {
        if (!selectedItems.includes(item)) {
            console.log('select')
            if (selectedItems.length < maxSelectable) {
                setSelectedItems([...selectedItems, item]);
            } else {
                console.log('No more items selectable. Maximum reached');
            }
        } else {
            setSelectedItems(selectedItems.filter(i => i.id !== item.id));
        }
    }

    return (
        <Container className="selectable-card-list">
            <div className="d-flex justify-content-center mb-4">
                <span className="empty-text text-secondary">
                    {'Select ' + maxSelectable + ' ' + itemType}
                </span>
            </div>
            {items.length > 0 &&
                <Row xs={1} md={4}>
                    {items.map((item, idx) => (
                        <SelectableCard
                            key={idx}
                            item={item}
                            isSelected={selectedItems.some(e => e.id === item.id)}
                            selectable={selectedItems.length < Number(maxSelectable)}
                            onSelectCard={onSelectCard}/>
                    ))}
                </Row>
            }
            {items.length === 0 &&
                <div className="d-flex justify-content-center mb-4">
                    <span className="empty-text text-secondary">{emptyText}</span>
                </div>
            }
        </Container>
	);
}

export default SelectableCardList;