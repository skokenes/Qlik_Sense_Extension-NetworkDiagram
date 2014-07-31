//requirejs(["d3.min"]);

define(["jquery", "text!./networkdiagram.css","./d3.min"], function($, cssContent) {'use strict';
	$("<style>").html(cssContent).appendTo("head");
	return {
		initialProperties : {
			version: 1.0,
			qHyperCubeDef : {
				qDimensions : [],
				qMeasures : [],
				qInitialDataFetch : [{
					qWidth : 3,
					qHeight : 500
				}]
			}
		},
		definition : {
			type : "items",
			component : "accordion",
			items : {
				dimensions : {
					uses : "dimensions",
					min : 2,
					max:2
				},
				measures : {
					uses : "measures",
					min : 1,
					max: 1
				},
				sorting : {
					uses : "sorting"
				},
				settings : {
					uses : "settings"
				}
			}
		},
		snapshot : {
			canTakeSnapshot : true
		},
		paint : function($element,layout) {
			 var qData = layout.qHyperCube.qDataPages[0];
			 var qMatrix = qData.qMatrix;
			 
			 var source = qMatrix.map(function(d) {
			 	return {
			 		"nodeA":d[0].qText,
			 		"nodeB":d[1].qText,
			 		"count":d[2].qNum
			 	}
			 });

			 //console.log(layout);
			 //console.log(source);
			 var id = "container_"+ layout.qInfo.qId;

			 if (document.getElementById(id)) {
			 	$("#" + id).empty();
			 }
			 else {
			 	$element.append($('<div />').attr("id", id).width($element.width()).height($element.height()));
			 }
			 


			 // unique list of nodes + sum of edges
			var source_B=sumEdges(source);
			// array of node ids
			var node_list = source_B.map(function(d){return d.nodeA;});
			// add node indexing to source data set
			source.forEach(function(d) {
			    d.source = node_list.indexOf(d.nodeA);
			    d.target = node_list.indexOf(d.nodeB);
			})

			// distinct list of edges
			var source_E=distinctEdges(source);

			//console.log(source_B);
			//console.log(source_E);
			// Visualization //

			var width = $element.width();
			var height = $element.height();
			var margin = {"top":0,"right":0};


			var force = d3.layout.force()
			    .charge(-1000)
			    .linkDistance(60)
			    .size([width-margin.right,height-margin.top]);

			var node_drag = d3.behavior.drag()
			        .on("drag", dragmove);

			var dragmove = function() {
				div.style("opacity",0);
				force.tick();
			};


			var chart_div = d3.select("#" + id);
			    
			var svg = chart_div.append("svg");
			    
			svg
			    .attr("width",width-margin.right)
			    .attr("height",height);  

			force
			    .nodes(source_B)
			    .links(source_E)
			    .start();
			    
			//var div = d3.select("body").append("div")
			var div = chart_div.append("div")
			    .attr("class","tooltip")
			    .attr("id","ext-tip")
			    .style("opacity",0);
			    
			var link = svg.selectAll(".link")
			    .data(source_E)
			    .enter().append("line")
			    .attr("class","link");

			var node = svg.selectAll(".node")
			    .data(source_B)
			    .enter().append("circle")
			    .attr("class","node")
			    .attr("r",function(d) {return Math.round(5+2*d.sum);})
			    .call(force.drag);

			node
				.on("mouseover", function(d,i){
					
					// Tooltip
					div
					    .style("opacity",1);
					div.html(d.nodeA + ": " + d.sum)
					    .style("left",(d3.event.pageX)+"px")
					    .style("top",(d3.event.pageY-28)+"px");
					
					// Current node
					d3.select(this)
			            .classed("active",true);
					    
					// Store indices of neighboring nodes
			        var nodeNeighbors = source.filter(function(p) {return d.nodeA == p.nodeA || d.nodeA == p.nodeB;})
			            .map(function(p){
			                    return p.nodeA === d.nodeA ? p.nodeB : p.nodeA;
			                });
			        
					 // Style neighboring nodes
					 node.filter(function(k) {return nodeNeighbors.indexOf(k.nodeA) > -1;})
			            .classed("neighbor",true);
			         
			         // Store indices of second-degree nodes
			         var nodeNeighborsNeighbors = source.filter(function(p) {return nodeNeighbors.indexOf(p.nodeA)>-1 || nodeNeighbors.indexOf(p.nodeB)>-1 ;})
			             .map(function(p){
			                if (nodeNeighbors.indexOf(p.nodeA)>-1 && d.nodeA != p.nodeB){
			                    return p.nodeB;
			                }
			                else if (nodeNeighbors.indexOf(p.nodeB)>-1 && d.nodeA != p.nodeA){
			                    return p.nodeA;
			                }
			             });
			         
			         // Select and style second-degree nodes
			         node.filter(function(k){return nodeNeighborsNeighbors.indexOf(k.nodeA) > -1 && nodeNeighbors.indexOf(k.nodeA)==-1;})
			            .classed("neighbor2",true);
			         
			         
			         // Select and style non-applicable nodes
			         node.filter(function(k){return nodeNeighborsNeighbors.indexOf(k.nodeA) == -1 && nodeNeighbors.indexOf(k.nodeA) == -1 && k.nodeA!=d.nodeA;})
			            .classed("inactive",true);
			         
			         // Select and style non-applicable links
			         link.filter(function(k){return nodeNeighbors.indexOf(k.nodeA) == -1 && nodeNeighbors.indexOf(k.nodeB) ==-1;})
			         .classed("inactive",true);

			         // Select and style direct links
			         link.filter(function(k){return (k.nodeA==d.nodeA || k.nodeB==d.nodeA);})
			            .classed("active",true);
			         
			         
			         // Select and style mutual friends links
			         link.filter(function(k){return k.nodeA!=d.nodeA && k.nodeB!=d.nodeA && (nodeNeighbors.indexOf(k.nodeA)>-1 || nodeNeighbors.indexOf(k.nodeB)>-1);})
			            .classed("neighbor",true);

			         
				});
			node
			    .on("mouseout", function(d){
			    	
			    	div
			    	    .style("opacity",0);

			    	d3.selectAll('.node')
			            .classed("active neighbor neighbor2 inactive",false);
			    	    
			    	d3.selectAll('.link')
			            .classed("active inactive neighbor",false);
			    });

			node
			    .on("mousedown", function(d){
			    	div
			    	    .style("opacity",0);
			    });

			force.on("tick", function() {
				link.attr("x1",function(d) { return d.source.x;})
				    .attr("y1",function(d) { return d.source.y;})
				    .attr("x2",function(d) { return d.target.x;})
				    .attr("y2",function(d) { return d.target.y;});
				    
				    node.attr("cx",function(d) {return d.x;})
				        .attr("cy", function(d) { return d.y; });
			});
			    
			// FUNCTIONS //

			function distinctEdges(source_data) {
				// this will only work if each edge is defined in both directions; otherwise, it will miss edges
				var source_edges = [];
				for (var i=0;i<source_data.length;i++){
					var source_index = source_data[i].source;
					var target_index = source_data[i].target;
					if(source_index>target_index){
						source_edges.push(source_data[i]);
					}
				}
				return source_edges;
			}

			function sumEdges(source_data) {
				var source_sum=[];
			    var node_i = 0;
				for (var i=0;i<source_data.length;i++){
					var curr_node = source_data[i].nodeA;
					var node_exists = 0;
					for (var j=0;j<source_sum.length;j++){
						var check_node = source_sum[j].nodeA;
						if(curr_node==check_node){
							node_exists=1;
							source_sum[j].sum+=1
						}
					}
					if(node_exists==0) {
						source_sum.push({"nodeA":curr_node, "sum":1, "index":node_i});
			            node_i++;
					}
					
				}
				return source_sum;
			}


			function clone(src) {
				function mixin(dest, source, copyFunc) {
					var name, s, i, empty = {};
					for(name in source){
						// the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
						// inherited from Object.prototype.	 For example, if dest has a custom toString() method,
						// don't overwrite it with the toString() method that source inherited from Object.prototype
						s = source[name];
						if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
							dest[name] = copyFunc ? copyFunc(s) : s;
						}
					}
					return dest;
				}

				if(!src || typeof src != "object" || Object.prototype.toString.call(src) === "[object Function]"){
					// null, undefined, any non-object, or function
					return src;	// anything
				}
				if(src.nodeType && "cloneNode" in src){
					// DOM Node
					return src.cloneNode(true); // Node
				}
				if(src instanceof Date){
					// Date
					return new Date(src.getTime());	// Date
				}
				if(src instanceof RegExp){
					// RegExp
					return new RegExp(src);   // RegExp
				}
				var r, i, l;
				if(src instanceof Array){
					// array
					r = [];
					for(i = 0, l = src.length; i < l; ++i){
						if(i in src){
							r.push(clone(src[i]));
						}
					}
					// we don't clone functions for performance reasons
					//		}else if(d.isFunction(src)){
					//			// function
					//			r = function(){ return src.apply(this, arguments); };
				}else{
					// generic objects
					r = src.constructor ? new src.constructor() : {};
				}
				return mixin(r, src, clone);

			}
			
		/* */
		}
		
	};
});
