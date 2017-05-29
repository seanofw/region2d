
import React from 'react';
import ReactDOM from 'react-dom';

import Sandbox from './sandbox';
import Editor from './editor';

class Demo extends React.Component {
	
	constructor(props) {
		super(props);

		this.state = {
			rects: [
				{ kind: "union", x: 100, y: 100, width: 200, height: 250, name: "A" },
				{ kind: "union", x: 50, y: 200, width: 600, height: 100, name: "B" },
				{ kind: "union", x: 250, y: 150, width: 200, height: 300, name: "C" },
				{ kind: "subtract", x: 275, y: 250, width: 250, height: 150, name: "D" },
			]
		};
	}

	onRectChange(index, rect) {
		this.setState(prevState => {
			const newRects = [];
			for (let rect of prevState.rects) {
				newRects.push(rect);
			}
			if (rect)
				newRects[index] = rect;
			else newRects.splice(index, 1);
			return {
				rects: newRects
			};
		});
	}

	render() {
		return (
			<div className="demo">
				<Sandbox rects={this.state.rects} onRectChange={this.onRectChange.bind(this)} />
				<Editor rects={this.state.rects} onRectChange={this.onRectChange.bind(this)} />
			</div>
		);
	}
}

ReactDOM.render(<Demo />, document.getElementById("app"));
