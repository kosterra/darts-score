import React from 'react';
import Avatar from 'react-avatar';
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
                        <div className="d-flex flex-column justify-content-center align-items-center">
                            <Avatar
                                name={item.firstname + ' ' + item.lastname}
                                src={item.profileImg}
                                size="80" round={true}
                                color="#565656"
                                textSizeRatio={0.2}
                                className="align-self-center"
                            />
                            <span className="mt-1 text-secondary">{item.firstname + ' ' + item.lastname}</span>
                        </div>
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
            if (selectedItems.length < maxSelectable) {
                setSelectedItems([...selectedItems, item]);
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