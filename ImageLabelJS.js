var imageLoader = document.getElementById('imageLoader');
imageLoader.addEventListener('change', handleImage, false);
var configLoader = document.getElementById('configLoader');
configLoader.addEventListener('change', handleConfig, false);
var canvas = document.getElementById('imageCanvas');
var context = canvas.getContext('2d');
var ImageInCanvas = new Image();
var ImageName = "";

var current_RGB=[];
var current_id=0;
var current_index=0;
var current_pointsX=[];
var current_pointsY=[];
var current_name="";
var mouseDown_X = 0;
var mouseDown_Y = 0;
var mouseMove_X = 0;
var mouseMove_Y = 0;
var current_bbox_X=0;
var current_bbox_Y=0;
var current_bbox_W=0;
var current_bbox_H=0;

var masks = [];  //[current_RGB, current_id, current_pointsX, current_pointsY, current_name]
var bboxs = [];  //[current_RGB, current_id, current_bbox_X, current_bbox_Y, current_bbox_W, current_bbox_H, current_name]

var isMouseDown = false;

var type_BBOX = "BBOX";
var type_MASK = "MASK";

var mode_ANNOTATION = "ANNOTATION";
var mode_DELETE = "DELETE";
var selectedMask_index = -1;
var selectedBbox_index = -1;

var modifying_point = false;
var pointToModify_Bbox = "";
var pointIndex_Mask=-1;
var modify_TopLeft = "TOPLEFT";
var modify_TopRight = "TOPRIGHT";
var modify_BotLeft = "BOTLEFT";
var modify_BotRight = "BOTRIGHT";

var configs=[];

function reinit(){
	current_RGB=[];
	current_id=0;
	current_index=0;
	current_pointsX=[];
	current_pointsY=[];
	current_name="";
	mouseDown_X = 0;
	mouseDown_Y = 0;
	mouseMove_X = 0;
	mouseMove_Y = 0;
	current_bbox_X=0;
	current_bbox_Y=0;
	current_bbox_W=0;
	current_bbox_H=0;
	masks = [];  //[current_RGB, current_id, current_pointsX, current_pointsY, current_name]
	bboxs = [];  //[current_RGB, current_id, current_bbox_X, current_bbox_Y, current_bbox_W, current_bbox_H, current_name]
	isMouseDown = false;
	selectedMask_index = -1;
	selectedBbox_index = -1;
	RefreshDrawing();
}

function reinitPartial(){
    current_pointsX=[];
	current_pointsY=[];
	mouseDown_X = 0;
	mouseDown_Y = 0;
	mouseMove_X = 0;
	mouseMove_Y = 0;
	current_bbox_X=0;
	current_bbox_Y=0;
	current_bbox_W=0;
	current_bbox_H=0;
	masks = [];  //[current_RGB, current_id, current_pointsX, current_pointsY, current_name]
	bboxs = [];  //[current_RGB, current_id, current_bbox_X, current_bbox_Y, current_bbox_W, current_bbox_H, current_name]
	isMouseDown = false;
	selectedMask_index = -1;
	selectedBbox_index = -1;
	RefreshDrawing();
}


//CANVAS EVENT
canvas.onmouseup = function(e){
	if(GetCurrentMode()==mode_ANNOTATION){
		if(configs.length>0){
			isMouseDown = false;
			if(GetCurrentAnnotationType()==type_BBOX){
				ValidateAnnotationBBOX();
				var loc = windowToCanvas(canvas, e.clientX, e.clientY);
				drawGuidelines(loc.x, loc.y);
			}
		}
	}
	if(GetCurrentMode()==mode_DELETE){
		if(pointToModify_Bbox!="" && modifying_point && selectedBbox_index!=-1){
			pointToModify_Bbox="";
			modifying_point=false;
		}
		if(pointIndex_Mask!=-1 && modifying_point && selectedMask_index!=-1){
			pointIndex_Mask=-1;
			modifying_point=false;
		}
	}	
	ActualizeDrawing(e);
}
canvas.onmousemove = function (e) {
	if(GetCurrentMode()==mode_ANNOTATION){
		if(configs.length>0 && current_name!=""){
			if(GetCurrentAnnotationType()==type_BBOX){
				if(isMouseDown){
					var loc = windowToCanvas(canvas, e.clientX, e.clientY);
					mouseMove_X = loc.x;
					mouseMove_Y = loc.y;
					if(mouseMove_X<mouseDown_X){
						current_bbox_W = mouseDown_X-mouseMove_X;
						current_bbox_X = mouseMove_X;	
					}
					if(mouseMove_X>=mouseMove_Y){
						current_bbox_X = mouseDown_X;
						current_bbox_W = mouseMove_X-mouseDown_X;
					}
					if(mouseMove_Y<mouseDown_Y){
						current_bbox_H = mouseDown_Y - mouseMove_Y;
						current_bbox_Y = mouseMove_Y;
					}
					if(mouseMove_Y>=mouseDown_Y){
						current_bbox_H = mouseMove_Y - mouseDown_Y;
						current_bbox_Y = mouseDown_Y;
					}
				}				
				ActualizeDrawing(e);
			}
		}
	}
	if(GetCurrentMode()==mode_DELETE){
		if(configs.length>0){
			if(modifying_point && selectedMask_index!=-1 && pointIndex_Mask!=-1){
				var loc = windowToCanvas(canvas, e.clientX, e.clientY);
				if(pointIndex_Mask==0 || pointIndex_Mask==masks[selectedMask_index][2].length-1){
					masks[selectedMask_index][2][0]=loc.x;
					masks[selectedMask_index][3][0]=loc.y;
					masks[selectedMask_index][2][masks[selectedMask_index][2].length-1]=loc.x;
					masks[selectedMask_index][3][masks[selectedMask_index][2].length-1]=loc.y;
				}else{
					masks[selectedMask_index][2][pointIndex_Mask]=loc.x;
					masks[selectedMask_index][3][pointIndex_Mask]=loc.y;
				}
			}
			if(pointToModify_Bbox!="" && modifying_point && selectedBbox_index!=-1){
				var loc = windowToCanvas(canvas, e.clientX, e.clientY);
				var modifDone = false;					
				var old_X = bboxs[selectedBbox_index][2];
				var old_Y = bboxs[selectedBbox_index][3];
				var old_W = bboxs[selectedBbox_index][4];
				var old_H = bboxs[selectedBbox_index][5];		
				if(pointToModify_Bbox==modify_TopLeft && !modifDone){		
					if(loc.x<bboxs[selectedBbox_index][2]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_W + (old_X-loc.x);
							bboxs[selectedBbox_index][5] = old_H + (old_Y-loc.y);
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_W + (old_X-loc.x);
							bboxs[selectedBbox_index][5] = old_Y+old_H-loc.y;
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y + old_H;
							bboxs[selectedBbox_index][4] = old_W-(loc.x-old_X);
							bboxs[selectedBbox_index][5] = loc.y-(old_Y + old_H);
							pointToModify_Bbox = modify_BotLeft;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2] && loc.x<bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_X+old_W-loc.x;
							bboxs[selectedBbox_index][5] = old_H + (old_Y-loc.y);
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_W-(loc.x-old_X);
							bboxs[selectedBbox_index][5] = old_Y+old_H-loc.y;
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y + old_H;
							bboxs[selectedBbox_index][4] = old_W-(loc.x-old_X);
							bboxs[selectedBbox_index][5] = loc.y-(old_Y + old_H);
							pointToModify_Bbox = modify_BotLeft;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = old_X+old_W;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X+old_W;
							bboxs[selectedBbox_index][5] = old_H + (old_Y-loc.y);
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X+old_W;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X+old_W;
							bboxs[selectedBbox_index][5] = old_Y+old_H-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X+old_W;
							bboxs[selectedBbox_index][3] = old_Y+old_H;
							bboxs[selectedBbox_index][4] = loc.x-old_X+old_W;
							bboxs[selectedBbox_index][5] = loc.y-bboxs[selectedBbox_index][3];
							pointToModify_Bbox = modify_BotRight;
						}
					}
					modifDone = true;
				}
				if(pointToModify_Bbox==modify_TopRight && !modifDone){
					if(loc.x<bboxs[selectedBbox_index][2]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_X-loc.x;
							bboxs[selectedBbox_index][5] = old_H + (old_Y-loc.y);
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_X-loc.x;
							bboxs[selectedBbox_index][5] = old_H + (old_Y-loc.y);
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y+old_H;
							bboxs[selectedBbox_index][4] = old_X-loc.x;
							bboxs[selectedBbox_index][5] = loc.y-(old_Y+old_H);
							pointToModify_Bbox = modify_BotLeft;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2] && loc.x<bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = old_H+old_Y-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = old_H+old_Y-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = old_Y+old_H;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = loc.y-(old_H+old_Y);
							pointToModify_Bbox = modify_BotRight;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = old_H+old_Y-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = old_H+old_Y-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = old_Y+old_H;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = loc.y-(old_H+old_Y);
							pointToModify_Bbox = modify_BotRight;
						}
					}
					modifDone = true;
				}
				if(pointToModify_Bbox==modify_BotLeft && !modifDone){
					if(loc.x<bboxs[selectedBbox_index][2]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_W+(old_X-loc.x);
							bboxs[selectedBbox_index][5] = old_Y-loc.y;
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = old_W+(old_X-loc.x);
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = old_W+(old_X-loc.x);
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotLeft;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2] && loc.x<bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_W+(old_X-loc.x);
							bboxs[selectedBbox_index][5] = old_Y-loc.y;
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = old_W+(old_X-loc.x);
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = old_W+(old_X-loc.x);
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotLeft;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = old_X+old_W;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-(old_X+old_W);
							bboxs[selectedBbox_index][5] = old_Y-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X+old_W;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = loc.x-bboxs[selectedBbox_index][2];
							bboxs[selectedBbox_index][5] = loc.y-bboxs[selectedBbox_index][3];
							pointToModify_Bbox = modify_BotRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X+old_W;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = loc.x-bboxs[selectedBbox_index][2];
							bboxs[selectedBbox_index][5] = loc.y-bboxs[selectedBbox_index][3];
							pointToModify_Bbox = modify_BotRight;
						}
					}
					modifDone = true;
				}
				if(pointToModify_Bbox==modify_BotRight && !modifDone){
					if(loc.x<bboxs[selectedBbox_index][2]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = old_X-loc.x;
							bboxs[selectedBbox_index][5] = old_Y-loc.y;
							pointToModify_Bbox = modify_TopLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = old_X-loc.x;
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotLeft;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = loc.x;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = old_X-loc.x;
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotLeft;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2] && loc.x<bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = old_Y-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotRight;
						}
					}else if(loc.x>=bboxs[selectedBbox_index][2]+bboxs[selectedBbox_index][4]){
						if(loc.y<bboxs[selectedBbox_index][3]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = loc.y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = old_Y-loc.y;
							pointToModify_Bbox = modify_TopRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3] && loc.y<bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotRight;
						}else if(loc.y>=bboxs[selectedBbox_index][3]+bboxs[selectedBbox_index][5]){
							bboxs[selectedBbox_index][2] = old_X;
							bboxs[selectedBbox_index][3] = old_Y;
							bboxs[selectedBbox_index][4] = loc.x-old_X;
							bboxs[selectedBbox_index][5] = loc.y-old_Y;
							pointToModify_Bbox = modify_BotRight;
						}
					}
					modifDone = true;
				}
			}
			ActualizeDrawing(e);
		}
	}
	ActualizeDrawing(e);
};
canvas.onmousedown = function (e) {
	if(GetCurrentMode()==mode_ANNOTATION){
		if(configs.length>0 && current_name!=""){
			var mouseClickType = e.button;
			isMouseDown = true;
			if(mouseClickType==0){//left
				var loc = windowToCanvas(canvas, e.clientX, e.clientY);
				if(GetCurrentAnnotationType()==type_MASK){
					current_pointsX.push(loc.x);
					current_pointsY.push(loc.y);
				}
				if(GetCurrentAnnotationType()==type_BBOX){
					current_bbox_X = loc.x;
					current_bbox_Y = loc.y;
					mouseDown_X = loc.x;
					mouseDown_Y = loc.y;
				}
			}else if(mouseClickType==1){//mid
			}else if(mouseClickType==2){//right
			}
			ActualizeDrawing(e);
		}
	}
	if(GetCurrentMode()==mode_DELETE){
		var mouseClickType = e.button;
		if(mouseClickType==0){//left
			var loc = windowToCanvas(canvas, e.clientX, e.clientY);
			if(GetCurrentAnnotationType()==type_MASK){
				if(selectedMask_index!=-1 && selectedMask_index<masks.length){
					var mask = masks[selectedMask_index];
					var found = false;
					for(var i=0;i<mask[2].length;i++){
						if(IsInBBox(loc.x,loc.y,[mask[2][i]-6,mask[3][i]-6,13,13])){
							modifying_point = true;
							found = true;
							pointIndex_Mask = i;
							break;
						}
					}
				}
				if(!modifying_point && pointIndex_Mask==-1){
					var found = false;
					for(var i=0;i<masks.length;i++){
						var mask = masks[i];
						if(IsInBBox(loc.x,loc.y,CalculateBbox(mask))){
							masks.push(mask);
							masks.splice(i,1);
							selectedMask_index = masks.length-1;
							ActualizeDrawing(e);
							found = true;
							break;
						}
					}
					if(!found){
						selectedMask_index=-1;
						ActualizeDrawing(e);
					}
				}
			}
			if(GetCurrentAnnotationType()==type_BBOX){
				if(selectedBbox_index!=-1 && selectedBbox_index<bboxs.length){
					var bbox = bboxs[selectedBbox_index];
					//Top-left
					if(IsInBBox(loc.x, loc.y,[bbox[2]-6,bbox[3]-6,13,13])){
						modifying_point = true;
						pointToModify_Bbox=modify_TopLeft;
					}
					//Top-right
					if(IsInBBox(loc.x, loc.y,[bbox[2]+bbox[4]-6,bbox[3]-6,13,13])){
						modifying_point = true;
						pointToModify_Bbox=modify_TopRight;
					}
					//Bottom-left
					if(IsInBBox(loc.x, loc.y,[bbox[2]-6,bbox[3]+bbox[5]-6,13,13])){
						modifying_point = true;
						pointToModify_Bbox=modify_BotLeft;
					}
					//Bottom-right
					if(IsInBBox(loc.x, loc.y,[bbox[2]+bbox[4]-6,bbox[3]+bbox[5]-6,13,13])){
						modifying_point = true;
						pointToModify_Bbox=modify_BotRight;
					}
				}
				if(pointToModify_Bbox=="" && !modifying_point){
					var found = false;
					for(var i=0;i<bboxs.length;i++){
						var bbox = bboxs[i];
						if(IsInBBox(loc.x,loc.y,[bbox[2],bbox[3],bbox[4],bbox[5]])){
							bboxs.push(bbox);
							bboxs.splice(i,1);
							selectedBbox_index = bboxs.length-1;
							ActualizeDrawing(e);
							found = true;
							break;
						}
					}
					if(!found){
						selectedBbox_index=-1;
						ActualizeDrawing(e);
					}
				}
			}
			}else if(mouseClickType==1){//mid
			}else if(mouseClickType==2){//right
		}
	}
	ActualizeDrawing(e);
};

function SaveToJSON(){
	if(GetCurrentAnnotationType()==type_BBOX && bboxs.length>0){
		var _image = ImageName;
		var _width = canvas.width;
		var _height = canvas.height;
		var _annotations = [];
		for(var i=0;i<bboxs.length;i++){
			_annotations.push({"label":bboxs[i][6], "xmin":bboxs[i][2], "ymin":bboxs[i][3], "xmax":bboxs[i][2]+bboxs[i][4], "ymax":bboxs[i][3]+bboxs[i][5]});
		}
		var _json = JSON.stringify({"image":_image,"width":_width,"height":_height,"annotations":_annotations});
		var _fileName = _image.split('.')[0];
		downloadObjectAsJson(_json,_fileName);
	}
	if(GetCurrentAnnotationType()==type_MASK && masks.length>0){
		var _image = ImageName;
		var _width = canvas.width;
		var _height = canvas.height;
		var _annotations = [];
		for(var i=0;i<masks.length;i++){
			_annotations.push({"label":masks[i][4], "x":masks[i][2], "y":masks[i][3]});
		}
		var _json = JSON.stringify({"image":_image,"width":_width,"height":_height,"annotations":_annotations});
		var _fileName = _image.split('.')[0];
		downloadObjectAsJson(_json,_fileName);
	}
}

function downloadObjectAsJson(exportObj, exportName){
	var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportObj);
	var downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute("href",     dataStr);
	downloadAnchorNode.setAttribute("download", exportName + ".json");
	document.body.appendChild(downloadAnchorNode); // required for firefox
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}

function CalculateBbox(mask){
	var bbox_Xmin = 100000000;
	var bbox_Ymin = 100000000;
	var bbox_Xmax = -100000000;
	var bbox_Ymax = -100000000;
	for(var i=0;i<mask[2].length;i++){
		var x = mask[2][i];
		var y = mask[3][i];
		if(x<bbox_Xmin){
			bbox_Xmin = x;
		}
		if(y<bbox_Ymin){
			bbox_Ymin = y;
		}
		if(x>bbox_Xmax){
			bbox_Xmax = x;
		}
		if(y>bbox_Ymax){
			bbox_Ymax = y;
		}
	}
	return [bbox_Xmin, bbox_Ymin, bbox_Xmax-bbox_Xmin, bbox_Ymax-bbox_Ymin];
}

function ResetSelection(){
	selectedMask_index = -1;
	selectedBbox_index = -1;
	modifying_point = false;
	pointToModify_Bbox = "";
	RefreshDrawing();
}

function RemoveSelection(){
	if(selectedBbox_index!=-1 && selectedBbox_index<bboxs.length){
		bboxs.splice(selectedBbox_index,1);
		selectedBbox_index = -1;
		RefreshDrawing();
	}
	if(selectedMask_index!=-1 && selectedMask_index<masks.length){
		masks.splice(selectedMask_index,1);
		selectedMask_index = -1;
		RefreshDrawing();
	}
}

function IsInBBox(x,y,bbox){
	return (x>=bbox[0] && x<=bbox[0]+bbox[2] && y>=bbox[1] && y<=bbox[1]+bbox[3]);
}

function GetCurrentAnnotationType(){
	var radios = document.getElementsByName('annotation_type');

	for (var i = 0, length = radios.length; i < length; i++) {
		if (radios[i].checked) {
			return radios[i].value;
		}
	}
}

function GetCurrentMode(){
	var radios = document.getElementsByName('mode');

	for (var i = 0, length = radios.length; i < length; i++) {
		if (radios[i].checked) {
			return radios[i].value;
		}
	}
}

function drawMasks(){
	if(GetCurrentAnnotationType()==type_MASK){
		for(var j=0;j<masks.length;j++){
			var mask = masks[j];	
			context.strokeStyle = "rgb("+mask[0][0]+","+mask[0][1]+","+mask[0][2]+")";
			context.fillStyle = "rgba("+mask[0][0]+","+mask[0][1]+","+mask[0][2]+",0.15)";
			context.beginPath();
			for(var i=0;i<mask[2].length;i++){
				if(i==0){				
					context.moveTo(mask[2][i],mask[3][i]);
				}else{
					context.lineTo(mask[2][i],mask[3][i]);
				}
			}
			context.closePath();
			context.fill();
			context.strokeStyle = "rgb("+mask[0][0]+","+mask[0][1]+","+mask[0][2]+")";
			context.fillStyle = "rgb("+mask[0][0]+","+mask[0][1]+","+mask[0][2]+")";
			for(var i=0;i<mask[2].length;i++){
				if(i<mask[2].length-1){
					context.lineWidth = 2;
					context.beginPath();
					context.moveTo(mask[2][i],mask[3][i]);
					context.lineTo(mask[2][i+1],mask[3][i+1]);
					context.closePath();
					context.stroke();
				}
				context.fillRect(mask[2][i]-4,mask[3][i]-4,9,9);
			}		
		}
	}
}

function drawBboxs(){
	if(GetCurrentAnnotationType()==type_BBOX){
		for(var j=0;j<bboxs.length;j++){
			var bbox = bboxs[j];
			context.strokeStyle = "rgb("+bbox[0][0]+","+bbox[0][1]+","+bbox[0][2]+")";
			context.fillStyle = "rgb("+bbox[0][0]+","+bbox[0][1]+","+bbox[0][2]+")";
			context.lineWidth = 2;
			context.beginPath();
			context.rect(bbox[2],bbox[3],bbox[4],bbox[5]);
			context.stroke();
			context.fillRect(bbox[2]-4,bbox[3]-4,9,9);
			context.fillRect(bbox[2]-4,bbox[3]+bbox[5]-4,9,9);
			context.fillRect(bbox[2]+bbox[4]-4,bbox[3]-4,9,9);
			context.fillRect(bbox[2]+bbox[4]-4,bbox[3]+bbox[5]-4,9,9);
			context.fillRect(bbox[2]-2,bbox[3]-2,5,5);
			context.fillRect(bbox[2]-2,bbox[3]+bbox[5]-2,5,5);
			context.fillRect(bbox[2]+bbox[4]-2,bbox[3]-2,5,5);
			context.fillRect(bbox[2]+bbox[4]-2,bbox[3]+bbox[5]-2,5,5);
		}
	}
}

function drawSelectedBbox(){
	if(GetCurrentMode()==mode_DELETE && GetCurrentAnnotationType()==type_BBOX && selectedBbox_index!=-1 && selectedBbox_index<bboxs.length){
		var bbox = bboxs[selectedBbox_index];
		context.strokeStyle = "rgb(0,0,0)";
		context.lineWidth = 4;
		context.beginPath();
		context.rect(bbox[2],bbox[3],bbox[4],bbox[5]);
		context.stroke();
		context.strokeStyle = "rgb(0,0,0)";
		context.fillStyle = "rgb(0,0,0)";
		context.fillRect(bbox[2]-6,bbox[3]-6,13,13);
		context.fillRect(bbox[2]-6,bbox[3]+bbox[5]-6,13,13);
		context.fillRect(bbox[2]+bbox[4]-6,bbox[3]-6,13,13);
		context.fillRect(bbox[2]+bbox[4]-6,bbox[3]+bbox[5]-6,13,13);
		context.strokeStyle = "rgb(255,255,255)";
		context.fillStyle = "rgb(255,255,255)";
		context.fillRect(bbox[2]-4,bbox[3]-4,9,9);
		context.fillRect(bbox[2]-4,bbox[3]+bbox[5]-4,9,9);
		context.fillRect(bbox[2]+bbox[4]-4,bbox[3]-4,9,9);
		context.fillRect(bbox[2]+bbox[4]-4,bbox[3]+bbox[5]-4,9,9);
	}
}

function drawSelectedMask(){
	if(GetCurrentMode()==mode_DELETE && GetCurrentAnnotationType()==type_MASK && selectedMask_index!=-1 && selectedMask_index<masks.length){
		var mask = masks[selectedMask_index];	
		context.strokeStyle = "rgb(0,0,0)";
		context.fillStyle = "rgba(0,0,0,0.15)";
		context.beginPath();
		for(var i=0;i<mask[2].length;i++){
			if(i==0){				
				context.moveTo(mask[2][i],mask[3][i]);
			}else{
				context.lineTo(mask[2][i],mask[3][i]);
			}
		}
		context.closePath();
		context.fill();
		for(var i=0;i<mask[2].length;i++){
			if(i<mask[2].length-1){				
				context.strokeStyle = "rgb(0,0,0)";
				context.fillStyle = "rgb(0,0,0)";
				context.lineWidth = 2;
				context.beginPath();
				context.moveTo(mask[2][i],mask[3][i]);
				context.lineTo(mask[2][i+1],mask[3][i+1]);
				context.closePath();
				context.stroke();
			}
			context.strokeStyle = "rgb(0,0,0)";
			context.fillStyle = "rgb(0,0,0)";
			context.fillRect(mask[2][i]-6,mask[3][i]-6,13,13);
			context.strokeStyle = "rgb(255,255,255)";
			context.fillStyle = "rgb(255,255,255)";
			context.fillRect(mask[2][i]-4,mask[3][i]-4,9,9);
		}	
	}
}

function RefreshDrawing(){
	drawImageInCanvas();
	drawMasks();
	drawBboxs();
	drawCurrent();
	drawSelectedBbox();
	drawSelectedMask();
}

function ValidateAnnotation(){
	if(GetCurrentAnnotationType()==type_MASK && configs.length>0 && current_pointsX.length>0){
		current_pointsX.push(current_pointsX[0]);
		current_pointsY.push(current_pointsY[0]);
		var mask = [current_RGB, current_id, current_pointsX, current_pointsY, current_name];
		masks.push(mask);
		setConfigNumber(current_index);
		RefreshDrawing();
	}
}

function ValidateAnnotationBBOX(){
	if(GetCurrentAnnotationType()==type_BBOX && configs.length>0 && (current_bbox_W!=0 || current_bbox_H!=0)){
		var bbox = [current_RGB, current_id, current_bbox_X, current_bbox_Y, current_bbox_W, current_bbox_H, current_name];
		bboxs.push(bbox);
		setConfigNumber(current_index);
		RefreshDrawing();
	}
}

function RemoveLast(){
	current_pointsX.pop();
	current_pointsY.pop();
	RefreshDrawing();
}

function RemoveLastBBox(){
	bboxs.pop();
	RefreshDrawing();
}

function RemoveLastMask(){
	masks.pop();
	RefreshDrawing();
}

function RemoveAll(){
	current_pointsX=[];
	current_pointsY=[];
	RefreshDrawing();
}

function Clear(){
	if(GetCurrentAnnotationType()==type_MASK){
		current_pointsX=[];
		current_pointsY=[];
		masks=[];
	}
	if(GetCurrentAnnotationType()==type_BBOX){
		var mouseDown_X = 0;
		var mouseDown_Y = 0;
		var mouseMove_X = 0;
		var mouseMove_Y = 0;
		var current_bbox_X=0;
		var current_bbox_Y=0;
		var current_bbox_W=0;
		var current_bbox_H=0;
		bboxs=[];
	}
	RefreshDrawing();
}

function setConfigNumber(number){
	var config = configs[number];
	current_RGB = [config[0],config[1],config[2]];
	current_id = config[3];
	current_index = number;
	if(GetCurrentAnnotationType()==type_MASK){
		current_pointsX = [];
		current_pointsY = [];
	}
	if(GetCurrentAnnotationType()==type_BBOX){
		current_bbox_X=0;
		current_bbox_Y=0;
		current_bbox_W=0;
		current_bbox_H=0;
	}
	current_name = config[4];
	document.getElementById('configdisp').innerHTML = "Label: "+current_name;
	RefreshDrawing();
}

function ActualizeDrawing(e){
	var loc = windowToCanvas(canvas, e.clientX, e.clientY);
	RefreshDrawing();
	drawGuidelines(loc.x, loc.y);
	document.getElementById('localization').innerHTML = "Position: "+loc.x + " " + loc.y;
}

function drawCurrent(){
	if(current_name!=""){
		if(GetCurrentAnnotationType()==type_MASK){
			for(var i=0;i<current_pointsX.length;i++){
				if(i<current_pointsX.length-1){
					context.strokeStyle = "rgb("+current_RGB[0]+","+current_RGB[1]+","+current_RGB[2]+")";
					context.lineWidth = 2;
					context.beginPath();
					context.moveTo(current_pointsX[i],current_pointsY[i]);
					context.lineTo(current_pointsX[i+1],current_pointsY[i+1]);
					context.closePath();
					context.stroke();
				}
				context.strokeStyle = "rgb(0,0,0)";
				context.fillStyle = "rgb(0,0,0)";
				context.fillRect(current_pointsX[i]-4,current_pointsY[i]-4,9,9);
				context.strokeStyle = "rgb(255,255,255)";
				context.fillStyle = "rgb(255,255,255)";
				context.fillRect(current_pointsX[i]-2,current_pointsY[i]-2,5,5);
			}
		}
		if(GetCurrentAnnotationType()==type_BBOX){
			context.strokeStyle = "rgb("+current_RGB[0]+","+current_RGB[1]+","+current_RGB[2]+")";
			context.lineWidth = 2;
			context.beginPath();
			context.rect(current_bbox_X,current_bbox_Y,current_bbox_W,current_bbox_H);
			context.stroke();
			context.strokeStyle = "rgb(0,0,0)";
			context.fillStyle = "rgb(0,0,0)";
			context.fillRect(current_bbox_X-4,current_bbox_Y-4,9,9);
			context.fillRect(current_bbox_X-4,current_bbox_Y+current_bbox_H-4,9,9);
			context.fillRect(current_bbox_X+current_bbox_W-4,current_bbox_Y-4,9,9);
			context.fillRect(current_bbox_X+current_bbox_W-4,current_bbox_Y+current_bbox_H-4,9,9);
			context.strokeStyle = "rgb(255,255,255)";
			context.fillStyle = "rgb(255,255,255)";
			context.fillRect(current_bbox_X-2,current_bbox_Y-2,5,5);
			context.fillRect(current_bbox_X-2,current_bbox_Y+current_bbox_H-2,5,5);
			context.fillRect(current_bbox_X+current_bbox_W-2,current_bbox_Y-2,5,5);
			context.fillRect(current_bbox_X+current_bbox_W-2,current_bbox_Y+current_bbox_H-2,5,5);
		}
	}
}

function windowToCanvas(canvas, x, y) {
   var bbox = canvas.getBoundingClientRect();

   return { x: Math.round(x - bbox.left * (canvas.width  / bbox.width)),
            y: Math.round(y - bbox.top  * (canvas.height / bbox.height))
          };
}

function drawGuidelines(x, y) {
   context.strokeStyle = 'rgba(0,0,0,1)';
   context.lineWidth = 0.5;
   drawVerticalLine(x);
   context.strokeStyle = 'rgba(255,255,255,1)';
   drawVerticalLine(x-0.5);
   drawVerticalLine(x+0.5);
   context.strokeStyle = 'rgba(0,0,0,1)';
   drawHorizontalLine(y);
   context.strokeStyle = 'rgba(255,255,255,1)';
   drawHorizontalLine(y-0.5);
   drawHorizontalLine(y+0.5);
}
function drawHorizontalLine (y) {
   context.beginPath();
   context.moveTo(0,y + 0.5);
   context.lineTo(context.canvas.width, y + 0.5);
   context.closePath();
   context.stroke();
}
function drawVerticalLine (x) {
   context.beginPath();
   context.moveTo(x + 0.5, 0);
   context.lineTo(x + 0.5, context.canvas.height);
   context.closePath();
   context.stroke();
}

function drawImageInCanvas() {
   context.drawImage(ImageInCanvas, 0, 0);
}

//Fonction pour charger une image unique et la load directement dans le canvas
function handleImage(e){
    var reader = new FileReader();
    reader.onload = function(event){
        var img = new Image();
        img.onload = function(){
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img,0,0);
			ImageInCanvas = img;
			reinitPartial();
        }
        img.src = event.target.result;		
    }
	ImageName = e.target.value;
	ImageName = ImageName.replace(/.*[\/\\]/, '');
    reader.readAsDataURL(e.target.files[0]);     
}

function reinitConfig(){
	configs=[];
	const myNode = document.getElementById("configdiv");
	while (myNode.firstChild) {
		myNode.removeChild(myNode.firstChild);
	}
}

//Fonction pour charger une config unique et la load directement dans le canvas
function handleConfig(e){
    var reader = new FileReader();
    reader.onload = function(event){
		var texte = event.target.result;
		var json = JSON.parse(texte);
		var count = 0;
		reinitConfig();
		reinit();
		for(var labelKey in json.labels){
			var label = json.labels[labelKey];
			var bouton = document.createElement("button");
			bouton.setAttribute( "onClick", "setConfigNumber("+ count + ")");
			bouton.innerHTML = label.name;
			bouton.setAttribute("style","border: 4px outset "+"rgb("+label.color[0]+","+label.color[1]+","+label.color[2]+");");
			document.getElementById('configdiv').appendChild(bouton);
			configs.push([label.color[0],label.color[1],label.color[2],label.id,label.name]);
			count=count+1;
		}			
		//alert(Object.keys(json.labels));
    }
	reader.readAsText(e.target.files[0]);
}
