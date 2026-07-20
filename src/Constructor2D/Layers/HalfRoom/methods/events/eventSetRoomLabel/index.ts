import { IHalfRoomData } from './../../../interfaces';

export default function eventSetRoomLabel(this: any, data: {
  roomId: number | string; // ID комнаты
  label: string; // Текст метки комнаты
}): void {

  // data.roomId - id комнаты
  // data.label - текст метки комнаты

  // Проверяем существование комнаты
  if ( this.parent.layers.planner.roomsMap.has(data.roomId)) {

    // Получаем объект комнаты
    const room = this.parent.layers.planner.roomsMap.get(data.roomId);

    room.label = data.label; // Устанавливаем метку комнаты
  
    const halfRoom = this.state.graphics.find((el: IHalfRoomData) => el.id === data.roomId);
    halfRoom.textName.text = room.label;

    // halfRoom.textName.x = center.x - halfRoom.textName.width / 2;
    // halfRoom.textName.y = center.y - halfRoom.textName.height / 2;

    this.parent.updateRoomStore(); // Обновляем состояние комнаты
    
  }

}